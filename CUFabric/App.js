/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useRef, useState} from 'react';
import type {Node} from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import {
  LineChart
} from 'react-native-chart-kit';

const Section = ({children, title}): Node => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        contentContainerStyle={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
};

const App: () => Node = () => {
  let interval = useRef(0);
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [sensor1Data, setSensor1Data] = useState([0]);
  const [sensor2Data, setSensor2Data] = useState([0]);

  useEffect(() => {
    interval.current = setInterval(() => {
      let new1Data = [
        ...sensor1Data,
        Math.random() * 100,
      ];
      let new2Data = [
        ...sensor2Data,
        Math.random() * 100,
      ];

      if ( new1Data.length > 25 ) {
        new1Data.shift();
      }

      if ( new2Data.length > 25 ) {
        new2Data.shift();
      }

      setSensor1Data(sensorData => new1Data);
      setSensor2Data(sensorData => new2Data);
    }, 250);

    return () => {
      clearInterval(interval.current);
    };
  }, [sensor1Data, sensor2Data, interval]);


  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        {/*<Header />*/}
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Section title="Sensor Data">
            <LineChart
                data={{
                  // labels: ["January", "February", "March", "April", "May", "June"],
                  datasets: [
                    {
                      data: sensor1Data,
                      color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                    },
                    {
                      data: sensor2Data,
                    }
                  ]
                }}
                width={Dimensions.get("window").width*.95} // from react-native
                height={Dimensions.get("window").height * .75}
                // yAxisLabel="$"
                // yAxisSuffix="k"
                yAxisInterval={1} // optional, defaults to 1
                chartConfig={{
                  backgroundColor: "#e26a00",
                  backgroundGradientFrom: "#fb8c00",
                  backgroundGradientTo: "#ffa726",
                  decimalPlaces: 2, // optional, defaults to 2dp
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#ffa726"
                  }
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16
                }}
            />
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
