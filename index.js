#!/usr/bin/env node
'use strict';

const mqtt = require('mqtt');
const commands = require('./app/commandEnums');
const argv = require('minimist')(process.argv.slice(2), {
  string: [ 'hvac-host', 'mqtt-broker-url', 'mqtt-topic-prefix', 'mqtt-username', 'mqtt-password'],
  '--': true,
});

/**
 * Helper: get property key for value
 * @param {*} value 
 */
Object.prototype.getKeyByValue = function( value ) {
  for( var prop in this ) {
      if( this.hasOwnProperty( prop ) ) {
           if( this[ prop ] === value )
               return prop;
      }
  }
}

/**
 * Connect to device
 */
const mqttTopicPrefix = argv['mqtt-topic-prefix'];
const deviceOptions = {
  host: argv['hvac-host'],
  onStatus: (deviceModel) => {
    client.publish(mqttTopicPrefix + '/temperature/get', deviceModel.props[commands.temperature.code].toString());
    client.publish(mqttTopicPrefix + '/fanspeed/get', commands.fanSpeed.value.getKeyByValue(deviceModel.props[commands.fanSpeed.code]).toString());
    // client.publish(mqttTopicPrefix + '/swinghor/get', commands.swingHor.value.getKeyByValue(deviceModel.props[commands.swingHor.code]).toString());
    client.publish(mqttTopicPrefix + '/swingvert/get', commands.swingVert.value.getKeyByValue(deviceModel.props[commands.swingVert.code]).toString());
    client.publish(mqttTopicPrefix + '/power/get', commands.power.value.getKeyByValue(deviceModel.props[commands.power.code]).toString());
    client.publish(mqttTopicPrefix + '/health/get', commands.health.value.getKeyByValue(deviceModel.props[commands.health.code]).toString());
    client.publish(mqttTopicPrefix + '/powersave/get', commands.energySave.value.getKeyByValue(deviceModel.props[commands.energySave.code]).toString());
    client.publish(mqttTopicPrefix + '/lights/get', commands.lights.value.getKeyByValue(deviceModel.props[commands.lights.code]).toString());
    client.publish(mqttTopicPrefix + '/quiet/get', commands.quiet.value.getKeyByValue(deviceModel.props[commands.quiet.code]).toString());
    client.publish(mqttTopicPrefix + '/blow/get', commands.blow.value.getKeyByValue(deviceModel.props[commands.blow.code]).toString());
    client.publish(mqttTopicPrefix + '/air/get', commands.air.value.getKeyByValue(deviceModel.props[commands.air.code]).toString());
    client.publish(mqttTopicPrefix + '/sleep/get', commands.sleep.value.getKeyByValue(deviceModel.props[commands.sleep.code]).toString());
    client.publish(mqttTopicPrefix + '/turbo/get', commands.turbo.value.getKeyByValue(deviceModel.props[commands.turbo.code]).toString());

    /**
     * Handle "off" mode status
     * Hass.io MQTT climate control doesn't support power commands through GUI,
     * so an additional pseudo mode is added
     */ 
    client.publish(mqttTopicPrefix + '/mode/get',
      (deviceModel.props[commands.power.code] === commands.power.value.on)
        ? commands.mode.value.getKeyByValue(deviceModel.props[commands.mode.code]).toString()
        : 'off'
    );
  },
  onUpdate: (deviceModel) => {
    console.log('[UDP] Status updated on %s', deviceModel.name)
  },
  onConnected: (deviceModel) => {
    client.subscribe(mqttTopicPrefix + '/temperature/set');
    client.subscribe(mqttTopicPrefix + '/mode/set');
    client.subscribe(mqttTopicPrefix + '/fanspeed/set');
    // client.subscribe(mqttTopicPrefix + '/swinghor/set');
    client.subscribe(mqttTopicPrefix + '/swingvert/set');
    client.subscribe(mqttTopicPrefix + '/power/set');
    client.subscribe(mqttTopicPrefix + '/health/set');
    client.subscribe(mqttTopicPrefix + '/powersave/set');
    client.subscribe(mqttTopicPrefix + '/lights/set');
    client.subscribe(mqttTopicPrefix + '/quiet/set');
    client.subscribe(mqttTopicPrefix + '/blow/set');
    client.subscribe(mqttTopicPrefix + '/air/set');
    client.subscribe(mqttTopicPrefix + '/sleep/set');
    client.subscribe(mqttTopicPrefix + '/turbo/set');
  }
};

let hvac;

/**
 * Connect to MQTT broker
 */

const mqttOptions = {};
let authLog = '';
if (argv['mqtt-username'] && argv['mqtt-password']) {
  mqttOptions.username = argv['mqtt-username'];
  mqttOptions.password = argv['mqtt-password'];
  authLog = ' as "' + mqttOptions.username + '"';
}
const client  = mqtt.connect(argv['mqtt-broker-url'], mqttOptions);
client.on('connect', () => {
  console.log('[MQTT] Connected to broker on ' + argv['mqtt-broker-url'] + authLog)
  hvac = require('./app/deviceFactory').connect(deviceOptions);
});

client.on('message', (topic, message) => {
  message = message.toString();
  console.log('[MQTT] Message "%s" received for %s', message, topic);

  switch (topic) {
    case mqttTopicPrefix + '/temperature/set':
      hvac.setTemp(parseInt(message));
      return;
    case mqttTopicPrefix + '/mode/set':
      if (message === 'off') {
        // Power off when "off" mode
        hvac.setPower(commands.power.value.off)
      } else {
        // Power on and set mode if other than 'off'
        if (hvac.device.props[commands.power.code] === commands.power.value.off) {
          hvac.setPower(commands.power.value.on)
        }
        hvac.setMode(commands.mode.value[message])
      }
      return;
    case mqttTopicPrefix + '/fanspeed/set':
      hvac.setFanSpeed(commands.fanSpeed.value[message])
      return;
    // case mqttTopicPrefix + '/swinghor/set':
    //   hvac.setSwingHor(commands.swingHor.value[message])
    //   return;
    case mqttTopicPrefix + '/swingvert/set':
      hvac.setSwingVert(commands.swingVert.value[message])
      return;
    case mqttTopicPrefix + '/power/set':
      hvac.setPower(parseInt(message));
      return;
    case mqttTopicPrefix + '/health/set':
      hvac.setHealthMode(parseInt(message));
      return;
    case mqttTopicPrefix + '/powersave/set':
      hvac.setPowerSave(parseInt(message));
      return;
    case mqttTopicPrefix + '/lights/set':
      hvac.setLights(parseInt(message));
      return;
    case mqttTopicPrefix + '/quiet/set':
      hvac.setQuietMode(parseInt(message));
      return;
    case mqttTopicPrefix + '/blow/set':
      hvac.setBlow(parseInt(message));
      return;
    case mqttTopicPrefix + '/air/set':
      hvac.setAir(parseInt(message));
      return;
    case mqttTopicPrefix + '/sleep/set':
      hvac.setSleepMode(parseInt(message));
      return;
    case mqttTopicPrefix + '/turbo/set':
      hvac.setTurbo(parseInt(message));
      return;
  }
  console.log('[MQTT] No handler for topic %s', topic)
});
