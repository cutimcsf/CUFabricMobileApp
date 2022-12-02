import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {BLEContext, EventEmitter} from './ble-context';
import {
  Dimensions,
  PermissionsAndroid,
  SafeAreaView,
  ScrollView,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {LineChart} from 'react-native-chart-kit';

export const Chart = () => {
  const {sensor, sensorData} = useContext(BLEContext);

  useEffect(() => {
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );

    return () => {};
  }, []);

  return (
    <LineChart
      data={{
        // labels: ["January", "February", "March", "April", "May", "June"],
        datasets: [
          {
            data: sensorData,
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          },
        ],
      }}
      width={Dimensions.get('window').width * 0.95} // from react-native
      height={Dimensions.get('window').height * 0.75}
      // yAxisLabel="$"
      // yAxisSuffix="k"
      yAxisInterval={1} // optional, defaults to 1
      chartConfig={{
        backgroundColor: '#e26a00',
        backgroundGradientFrom: '#fb8c00',
        backgroundGradientTo: '#ffa726',
        decimalPlaces: 2, // optional, defaults to 2dp
        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        style: {
          borderRadius: 16,
        },
        propsForDots: {
          r: '6',
          strokeWidth: '2',
          stroke: '#ffa726',
        },
      }}
      //bezier
      style={{
        marginVertical: 8,
        borderRadius: 16,
      }}
    />
  );
};
