/**
 * ble-context.js
 * @author Tim Sweeney-Fanelli
 *
 * Implementation of the BLEContext and BLEProvider objects. Together, these are the context and
 * context-provider (respectively) for the react-native context which encapsulates this app's
 * BLE functionality. Learn more here: https://reactjs.org/docs/context.html
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo, useRef,
  useState,
} from 'react';
import {BleManager} from 'react-native-ble-plx';
import {Buffer} from 'buffer';

import {LogBox, PermissionsAndroid, Platform} from 'react-native';
LogBox.ignoreLogs(['new NativeEventEmitter']);

/*
 * This is the template for the context object ... it defines the fields and
 * default initial values that it contains. Actual values are passed to the provider
 * at the very end of this source in the BLEProvider's return method
 */
export const BLEContext = createContext({
  sensor: Device undefined,
  sensorData: [],
});

/*
 * The BLEManager is provided by the react-native-ble-plx library, and is our
 * main interface to the BLE interface on the mobile app.
 *
 * The instance resides outside the scope of the BLEProvider because the react objects
 * are recreated and re-rendered with every state update. We do not want BLEManager
 * instantiating multiple times. I am almost certain this could be safely moved inside
 * the BLEProvider using the 'useRef' hook -- but I haven't tried that yet.
 */
const blemanager = new BleManager();

/*
 * This is the context provider ... It is the top-level element used by App.js
 * when the app is rendered.
 */
export const BLEProvider = ({children}) => {
  /*
   * The discovered sensor object
   */
  let [sensor, setSensor] = useState(undefined);

  /*
   * The list of values obtained from the sensor (to be rendered by the line graph in chart.js)
   */
  const [sensorData, setSensorData] = useState([0]);

  /*
   * The service and characteristic UUIDs for the Clarkson Insole demo device's "readCounter"
   * method.
   */
  const CU_FAB_SERVICE = '88189766-42ED-4E52-8E9F-47C7DECD82A9';
  const CU_FAB_COUNTER_CHARACTERISTIC = 'F8898AF6-786E-4058-B910-4244CECD3008';

  /**
   * This method scans for BLE devices until it finds one with a name beginning with "Clarkson"
   *
   * Once it's found, we stop scanning, obtain a connection to the device, and then
   * save the device in the 'sensor' state variable defined above.
   *
   * Methods, like variables, get redefined over and over in react everytime the object's state
   * changes -- so here, we use the 'useCallback' hook to wrap the method definition. By doing so,
   * we define the method and the things it's dependent on. A method wrapped in a useCallback will
   * only be redefined if one if its dependencies is changed -- in this case, there are no
   * dependencies, so the method is never redefined.
   */
  let scanAndConnect = useCallback(() => {
    // Start scanning for BLE devices -- we don't use any filters, so it'll discover everything in range.
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

        // Before we can use the device we found, we must (1) connect to it, and
        // (2) discover its services and characteristics. This is time-consuming
        // so we do it here once, rather than each time we need to read a value.
        console.log('Setting sensor');
        blemanager
          .connectToDevice(device.id)
          .then(d => {
            // Device is connected, now read the GATT db.
            return blemanager.discoverAllServicesAndCharacteristicsForDevice(
              d.id,
            );
          })
          .then(d => {
            // GATT db is read and ready to use ...
            // Store the device in the sensor state object for use later.
            console.log('Device connected ... ' + d.id);
            setSensor(d);
            return;
          })
          .catch(error => {
            // If any of the above failed, or something unexpected occurred, we'll
            // wind up here in this catch handler ... lets do some cleanup
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

  /**
   * This method obtains the latest value from the sensor and appends it to the list
   * stored in the sensorData state variable. It is a callback method dependent on the
   * 'sensor' and 'sensorData' objects -- so if either of those two values are changed,
   * this callback gets re-defined.
   *
   * This is critical, because if we don't redefine the method after a state change, then
   * subsequent calls to it are using stale references to old values and the app will not
   * behave the way we want it to.
   *
   * @type {(function(): Promise<number|number>)|*}
   */
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
        // Characteristic values are base-64 encoded buffers in the
        // react-native-ble-plx API ... here we're decoding it as a
        // single 8-bit integer, but I didn't actually cross-reference
        // this against the device's firmware ... it's possible the device
        // is returning a 16 or 32-bit integer value? In which case, we
        // need to decode up to 4 bytes of data from this buffer ... keep
        // in mind there will be an endian mismatch, so you'll need to flip
        // the bytes around and so some bit-shifting if needed.
        let buffer = new Buffer(characteristic.value, 'base64');
        let value = Uint8Array.from(buffer)[0];

        // Straight-lines don't make good demos -- let's record
        // the sin(value/2) instead.
        let new1Data = [...sensorData, Math.sin(value / 2)];

        // We only want to accumulate 25 datapoints, and then
        // start rolling ...
        if (new1Data.length > 25) {
          new1Data.shift();
        }

        // Update the sensorData state object ... this sets off a chain reaction
        // documented in the 'useEffect' hooks written below.
        setSensorData(sensorData => new1Data);

        return value;
      })
      .catch(error => {
        console.error(error);
        return -1;
      });
  }, [sensor, sensorData]);

  /*
   * This is a quick helper which wraps an asynchronous 'thenable' method in a timeout
   */
  const timeout = (promise, time) =>
    Promise.race([promise, new Promise((_r, rej) => setTimeout(rej, time))]);

  /*
   * 'time' in milliseconds -- used for the delay between sensor value updates, and
   * also for the timeout around the asyncronous call to read the sensor value.
   */
  let time = useRef(200);

  /*
   * emitCurrentValue calls readSensorValue to update the current reading, and displays
   * the result on the console ... it's had a more useful function in a previous iteration
   * of this code, but it wasn't working properly and I never fully refactored it out.
   */
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

  /*
   * A react component can respond to state changes using a 'useEffect' hook ... this
   * is a special-case of the useEffect hook which has no dependencies (deps: is an empty list)...
   *
   * The effect is triggered before the component mounts, and is torn down after the component is
   * unmounted.
   */
  useEffect(() => {
    // Get android permission for location... this is required
    // for bluetooth access ...
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(result => {
        if (result) {
          console.log('ACCESS_FINE_LOCATION is granted');
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then((result) => {
            if (result) {
              console.log('ACCESS_FINE_LOCATION is granted');
            } else {
              console.error('User refuse ACCESS_FINE_LOCATION');
            }
          });
        }
      });
    }

    scanAndConnect();

    return () => {
      console.error('Unmounting context');
      if ( sensor ) {
        blemanager.cancelDeviceConnection(sensor.id);
      }
    };
  }, []);

  /*
   * This effect is used to read the sensor value repeatedly after a fixed delay ... it waits
   * for 'time' (see above) milliseconds, and then calls emitCurrentValue. The logic here gets a
   * little convoluted ... here's the sequence of events:
   *
   * 1) This effect is triggered before the component mounts setting the initial timer to 'time' milliseconds
   * 2) After 'time' milliseconds, emitCurrentValue is invoked
   * 3) emitCurrentValue calls readSensorValue
   * 4) readSensorValue modifies the sensorData state object
   * 5) Since emitCurrentValue is a callback dependent on sensorData, emitCurrentValue is redefined after this invocation
   * 6) Since this effect is dependent on emitCurrentValue, it is executed AGAIN after emitCurrentValue is redefined
   * 7) When the effect is executed, return to step 2 and repeat indefinitely.
   */
  useEffect(() => {
    if (sensor) {
      setTimeout(emitCurrentValue, time.current);
    }
  }, [emitCurrentValue, sensor]);

  /*
   * This is the actual object we'll provide as the context to nested elements.
   */
  const context = {
    sensor: sensor,
    sensorData: sensorData,
  };

  /*
   * Finally -- render the BLEContext.Provider giving it the context object.
   */
  return <BLEContext.Provider value={context}>{children}</BLEContext.Provider>;
};
