import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo, useRef,
  useState,
} from 'react';
import {BleManager} from 'react-native-ble-plx';
import {Buffer} from 'buffer';

import {LogBox} from 'react-native';
LogBox.ignoreLogs(['new NativeEventEmitter']);

export const BLEContext = createContext({
  sensor: undefined,
  sensorData: [],
});

const blemanager = new BleManager();
export const BLEProvider = ({children}) => {
  let [sensor, setSensor] = useState(undefined);
  const [sensorData, setSensorData] = useState([0]);

  const CU_FAB_SERVICE = '88189766-42ED-4E52-8E9F-47C7DECD82A9';
  const CU_FAB_COUNTER_CHARACTERISTIC = 'F8898AF6-786E-4058-B910-4244CECD3008';

  let scanAndConnect = useCallback(() => {
    blemanager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        // Handle error (scanning will be stopped automatically)
        console.info('Unable to scan for devices ...');
        console.log(error);

        return;
      }

      // Check if it is a device you are looking for based on advertisement data
      // or other criteria.
      if (device && device.name && device.name.startsWith('Clarkson')) {
        // Stop scanning as it's not necessary if you are scanning for one device.
        blemanager.stopDeviceScan();

        console.log('Setting sensor');
        blemanager
          .connectToDevice(device.id)
          .then(d => {
            return blemanager.discoverAllServicesAndCharacteristicsForDevice(
              d.id,
            );
          })
          .then(d => {
            console.log('Device connected ... ' + d.id);
            setSensor(d);
            return;
          })
          .catch(error => {
            console.error('Uh oh!');
            blemanager
              .cancelDeviceConnection(device.id)
              .then(device => {
                console.error(error);
              })
              .catch(error2 => {
                console.error(error);
                console.error(error2);
              });
          });
      }
    });
  }, []);

  let readSensorValue = useCallback(async () => {
    console.log('Reading sensor value');
    if (sensor == undefined) {
      return -1;
    }

    // Attempt to connect
    return blemanager
      .readCharacteristicForDevice(
        sensor.id,
        CU_FAB_SERVICE,
        CU_FAB_COUNTER_CHARACTERISTIC,
      )
      .then(characteristic => {
        let buffer = new Buffer(characteristic.value, 'base64');
        let value = Uint8Array.from(buffer)[0];

        let new1Data = [...sensorData, Math.sin(value / 2)];
        if (new1Data.length > 25) {
          new1Data.shift();
        }
        setSensorData(sensorData => new1Data);

        return value;
      })
      .catch(error => {
        console.error(error);
        return -1;
      });
  }, [sensor, sensorData]);

  const timeout = (promise, time) =>
    Promise.race([promise, new Promise((_r, rej) => setTimeout(rej, time))]);

  let time = useRef(200);
  let emitCurrentValue = useCallback(() => {
    timeout(readSensorValue(), time.current)
      .then(value => {
        console.log('Current value: ' + value);
        return value;
      })
      .catch(error => {
        if (error) console.log(error);
      });
  }, [readSensorValue, time]);

  useEffect(() => {
    scanAndConnect();

    return () => {
      console.error("Unmounting context")
      if ( sensor ) {
        blemanager.cancelDeviceConnection(sensor.id);
      }
    };
  }, []);

  let interval = useRef(0);
  useEffect(() => {
    if (sensor) {
      setTimeout(emitCurrentValue, time.current);
    }
  }, [emitCurrentValue, sensor]);

  const context = {
    sensor: sensor,
    sensorData: sensorData,
  };

  return <BLEContext.Provider value={context}>{children}</BLEContext.Provider>;
};
