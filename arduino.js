///
///                           H2C DEVELOPMENT CONFIDENTIAL
///
/// Unpublished Copyright (c) 2020 2021 H2C DEVELOPMENT, All Rights Reserved.
///
/// NOTICE:  All information contained herein is, and remains the property of H2C DEVELOPMENT. The intellectual and technical concepts contained
/// herein are proprietary to H2C DEVELOPMENT and may be covered by Maroccan and Foreign Patents, patents in process, and are protected by trade secret or copyright law.
/// Dissemination of this information or reproduction of this material is strictly forbidden unless prior written permission is obtained
/// from H2C DEVELOPMENT.  Access to the source code contained herein is hereby forbidden to anyone except current COMPANY employees, managers or contractors who have executed
/// Confidentiality and Non-disclosure agreements explicitly covering such access.
///
/// The copyright notice above does not evidence any actual or intended publication or disclosure  of  this source code, which includes
/// information that is confidential and/or proprietary, and is a trade secret, of  COMPANY.   ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
/// OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT  THE EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION OF APPLICABLE
/// LAWS AND INTERNATIONAL TREATIES.  THE RECEIPT OR POSSESSION OF  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY RIGHTS
/// TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE, USE, OR SELL ANYTHING THAT IT  MAY DESCRIBE, IN WHOLE OR IN PART.
///
///
///

// get the reference of EventEmitter class of events module
var events = require(`events`);
let SerialPort = require(`serialport`);
const asyncLock = require(`async-lock`);
const logger = require('./logger.js');
const lock = new asyncLock();

//MAPING OUTPUTS
const OUTPUT_POWER_CELL = `99`;

//OUTPUT state
const OUT_ON = `1`;
const OUT_OFF = `0`;


let ControllinoSerialPort;

//serial reception buffer
let tempBuffer1 = ``;
let statusCmd1 = ``;
let input1 = 0;
let SerialComBusy = false;

// Queue to handle multiple concurrent commands
// Each command gets its own entry with resolve/reject callbacks
let pendingCommands = [];


let ControllinovendorId = `2341`;
let ControllinoPort;

let emitter = new events.EventEmitter();

SerialPort.list()
  .then((ports) => {
    logger.info(
      'ARDUINO',
      `Available serial ports: ${ports.map((item) => item.path).join(', ')}`
    );
    ControllinoPort = ports.find(
      (port) => port.vendorId === ControllinovendorId
    );
    // ControllinoPort = ports.find(
    //   (port) => port.path === "COM4"
    // );
    if (ControllinoPort) {
      logger.info(
        'ARDUINO',
        `Selected Controllino port: ${ControllinoPort.path}`
      );
    } else {
      logger.error(
        'ARDUINO',
        'Controllino serial port NOT FOUND'
      );
    }
  })
  .catch((error) => {
    logger.error('ARDUINO', 'Error listing serial ports:', error);
  });

setTimeout(() => {
  if (ControllinoPort) initControllinoSerialPort(ControllinoPort.path);
}, 5000);



function initControllinoSerialPort(portPath) {
  logger.info('ARDUINO', `Initializing Controllino port: ${portPath}`);
  ControllinoSerialPort = new SerialPort(portPath, {
    baudRate: 9600,
    autoOpen: false,
  });

  ControllinoSerialPort.open();
  ControllinoSerialPort.on(`data`, function (data) {
    // Ensure we append ASCII, not a Buffer object
    const s = data.toString('utf8');
    tempBuffer1 += s;
    // Uncomment for debug: console.error(`[RX] ` + s);
    manageSerialPort1();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//cut message in 2 parts (splits command to prevent serial buffer overflow)
async function sendIn2Parts(mes) {
  await lock.acquire('exampleLock', async () => {
    SerialComBusy = true;
    ControllinoSerialPort.write(mes.slice(0, 1));
    await sleep(50); // Reduced from 110ms to 50ms for faster LED updates
    ControllinoSerialPort.write(mes.slice(1));
    await sleep(10); // Small delay before marking as not busy
    SerialComBusy = false;
  });
}

//send serial command (waits if busy)
async function sendSerial(mes) {
  // Acquire lock to ensure sequential sending
  await lock.acquire('loopLock', async () => {
    // Wait until serial is not busy, then send
    while (SerialComBusy === true) {
      await sleep(10); // Wait 10ms before checking again
    }
    await sendIn2Parts(mes);
  });
}

/**
 * Send serial command to Controllino (fire-and-forget for LED commands)
 * LED commands (O prefix) don't wait for response for better performance
 * Input commands (I prefix) wait for response
 * Returns promise that resolves when command completes
 */
async function sendCmd1(mes) {
  // Check if this is an LED/Output command (starts with O)
  const isOutputCommand = mes[0] === 'O';

  if (!ControllinoSerialPort) {
    emitter.emit(`cmdFailedEvent`, `no serial port 1`);
    throw new Error('no serial port 1');
  }

  // For LED commands: fire-and-forget (no waiting for response)
  if (isOutputCommand) {
    logger.serial(mes);
    sendSerial(mes).catch(err => {
      logger.error('ARDUINO', `Failed to send LED command: ${err.message}`);
    });
    return Promise.resolve(1); // Immediate success
  }

  // For Input commands: wait for response (original behavior)
  let promise = new Promise((resolve, reject) => {
    // Create command entry with its own timeout
    const commandEntry = {
      message: mes,
      resolve: resolve,
      reject: reject,
      timeoutId: null,
      timestamp: Date.now()
    };

    // Set timeout for this specific command
    commandEntry.timeoutId = setTimeout(() => {
      // Remove this command from queue
      const index = pendingCommands.indexOf(commandEntry);
      if (index > -1) {
        pendingCommands.splice(index, 1);
      }
      emitter.emit(`cmdFailedEvent`, `no answer from arduino1`);
      reject(new Error('no answer from arduino1'));
    }, 2000);

    // Add to pending queue
    pendingCommands.push(commandEntry);

    // Colored serial command box - only shown at DEBUG level
    logger.serial(mes);
    sendSerial(mes);
  });

  let result = await promise; // wait until the promise resolves (*)

  return input1;
}

function manageInputEvent(mes, input) {
  var a = parseInt(Number(`0x` + input), 10); //attention 10 ? il faut un mot de 16bits

  // NOTE: Removed the "if (mes == '21')" check that was blocking button 21 events
  // The I21 getinput response is already handled in manageSerialPort1() at line 242-264
  // This function should only handle individual button/hole input events

  if (mes[0] == `0`) {
    mes = mes.substring(1);
  }
  //console.log(`mes = `, mes , ` a= `,a);
  if (mes.length > 0) {
    //console.log(`event:` + mes+` dec:`+a.toString());
    emitter.emit(`EventInput`, mes, a);
  }
}

function manageSerialPort1() {
  //Expected format Inn
  //Expected format On
  //if I is missing, remove unused data
  while (true) {
    var offsetO = tempBuffer1.indexOf(`O`);
    var offsetI = tempBuffer1.indexOf(`I`);

    //return if nothing to do
    if (offsetO < 0 && offsetI < 0) break;

    //check if answer to Output command
    if (offsetO > offsetI) {
      //manage frame 0
      if (offsetO >= 0) {
        //remove unused data => in case of error or frame not well formatted
        tempBuffer1 = tempBuffer1.substring(offsetO);
        if (tempBuffer1.length > 1) {
          statusCmd1 = tempBuffer1.substring(1, 2);
          // If statusCmd1 == 1 then send an Succes event else Failed event
          if (statusCmd1 != `1`) emitter.emit(`cmdFailedEvent`);

          // Resolve the oldest pending command (FIFO queue)
          if (pendingCommands.length > 0) {
            const commandEntry = pendingCommands.shift(); // Remove first command
            clearTimeout(commandEntry.timeoutId); // Clear its timeout
            commandEntry.resolve(input1); // Resolve its promise
          }

          //remove string processed
          tempBuffer1 = tempBuffer1.substring(2);
        } else break; //string too short, end of processing
      }
    }
    //check if input event
    if (offsetI >= 0) {
      //remove unused data => in case of error or frame not well formatted
      tempBuffer1 = tempBuffer1.substring(offsetI);
      // console.log(`message debug:` + tempBuffer1);
      //event I01x
      if (tempBuffer1.length > 6) {
        // new format I21xxyy
        // Resolve the oldest pending command (FIFO queue)
        if (pendingCommands.length > 0) {
          const commandEntry = pendingCommands.shift(); // Remove first command
          clearTimeout(commandEntry.timeoutId); // Clear its timeout
          commandEntry.resolve(input1); // Resolve its promise
        }

        // Extract status (for backward compatibility)
        statusCmd1 = tempBuffer1.substring(1, 3);

        manageInputEvent(
          tempBuffer1.substring(1, 3),
          tempBuffer1.substring(3, 7)
        ); //a verifier
        tempBuffer1 = tempBuffer1.substring(5);
      } else break; //string too short, end of processing
    }
  }
}

function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, `0`);
  const minutes = now.getMinutes().toString().padStart(2, `0`);
  const seconds = now.getSeconds().toString().padStart(2, `0`);

  return `${hours}:${minutes}:${seconds}`;
}

function getCurrentDateTime() {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, `0`);
  const month = (now.getMonth() + 1).toString().padStart(2, `0`); // Months are zero-based, so we add 1
  const year = now.getFullYear().toString();
  const hours = now.getHours().toString().padStart(2, `0`);
  const minutes = now.getMinutes().toString().padStart(2, `0`);
  const seconds = now.getSeconds().toString().padStart(2, `0`);

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
/////////////////////// Interfaces for game managment /////////////////////////




function powerOnCell() {
  logger.debug('ARDUINO', 'Turning ON cell light');
  sendCmd1(`O` + OUTPUT_POWER_CELL + OUT_ON);
}

function powerOffCell(val) {
  logger.debug('ARDUINO', 'Turning OFF cell light');
  sendCmd1(`O` + OUTPUT_POWER_CELL + OUT_OFF);
}

// protocol 0xxY xx= output Y=color, W if state =0
async function set_output(num, val, color = 'w') {
  var n = num.toString();
  var v = val.toString();
  var c = color.toString()[0]; // Take first character of color
  if (n.length == 1) n = `0` + n;

  if (v=='0') //power off led = W
   c = 'w';

  // Human-readable description
  const stateDesc = val == 1 ? 'ON' : 'OFF';
  const colorDesc = val == 1 ? ` (${c})` : '';
    console.log(`[ARDUINO] Output ${num} → ${stateDesc}${colorDesc}`);
    console.log(`[${getCurrentTime()}] [ARDUINO] Output ${num} → ${stateDesc}${colorDesc}\n`);


  // New protocol: O{NN}{0|1}{color}
  sendCmd1(`O` + n + c);
  await sleep(500);
  }

// Raw output command: O{NN}{state} format (for cell power, etc.)
// Example: O991 (output 99 ON), O990 (output 99 OFF)
function set_output_raw(num, state) {
  var n = num.toString();
  var s = state.toString();
  if (n.length == 1) n = `0` + n;

  const stateDesc = state == 1 ? 'ON' : 'OFF';
  logger.info('ARDUINO', `Raw output ${num} → ${stateDesc}`);

  sendCmd1(`O` + n + s);
}

// Send special effect command: O{NNN} format (for hardware transition effects)
// Example: O001 (level change effect), O002 (round change effect)
async function send_effect(effectCode) {
  var code = effectCode.toString();
  // Pad to 3 digits
  while (code.length < 3) code = `0` + code;

  logger.info('ARDUINO', `Special effect code: ${code}`);
  console.log(`[${getCurrentTime()}] Special effect code: ${code}\n`);
  
  sendCmd1(`O` + code);
  await sleep(500);
}

async function get_input1() {
  //get inputs values
  input1 = 0;
  return sendCmd1(`I`).then((val) => {
    return val;
  });
}

async function get_input2() {
  //get inputs values
  input2 = 0;
  return;
}

//Power led bar from 0% to 100%
function setBarled(val) {
  if (val == 0) val = 1;
  logger.debug('ARDUINO', `Bar LED → ${val}%`);
  sendCmd1(`L01` + String.fromCharCode(val));
}

module.exports = {
  OUT_ON,
  OUT_OFF,
  powerOnCell,
  powerOffCell,
  getCurrentTime,
  getCurrentDateTime,
  emitter,
  get_input1,
  get_input2,
  set_output,
  set_output_raw,
  send_effect,
  setBarled,
};
