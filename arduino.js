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

//timer timeout output command ID
let timeoutId;

//used to manage timeout in case of several commands in very short time
let nbrOfComdOngoing = 0;
let fAnswerReceived1 = false;
let timeoutIdTab1 = [];
let comptCmd1 = 0;

let ControllinovendorId = `2341`;
let ControllinoPort;

let emitter = new events.EventEmitter();

SerialPort.list()
  .then((ports) => {
    console.log(
      `[${getCurrentTime()}]   AVAILABLE SERIAL PORTS:`,
      ports.map((item) => item.path)
    );
    ControllinoPort = ports.find(
      (port) => port.vendorId === ControllinovendorId
    );
    if (ControllinoPort) {
      console.log(
        `[${getCurrentTime()}]   SELECTED CONTROLLINO SERIAL PORT: ${
          ControllinoPort.path
        }`
      );
    } else {
      console.error(
        `[${getCurrentTime()}]   CONTROLLINO SERIAL PORT NOT FOUND.`
      );
    }
  })
  .catch((error) => {
    console.error(`[${getCurrentTime()}]   ERROR LISTING SERIAL PORTS:`, error);
  });

setTimeout(() => {
  if (ControllinoPort) initControllinoSerialPort(ControllinoPort.path);
}, 5000);



function initControllinoSerialPort(portPath) {
  console.log(`[${getCurrentTime()}]   INIT PORT CONTROLLINO => ` + portPath);
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

//cut message in 2 parts
async function sendIn2Parts(mes) {

  await lock.acquire('exampleLock', async () => {
    if (SerialComBusy === true) {
      return;
    }

    SerialComBusy = true;
    ControllinoSerialPort.write(mes.slice(0, 1));
    await sleep(110);
    ControllinoSerialPort.write(mes.slice(1));
    SerialComBusy = false;
  });
}

//send serial in loop
async function sendSerial(count) {

  await lock.acquire('loopLock', async () => {
    do {
      await sendIn2Parts(count);
    } while (SerialComBusy === true);
  });
}

async function sendCmd1(mes) {
  statusCmd1 = ``;
  fAnswerReceived1 = false;

  let promise = new Promise((resolve, reject) => {
    //    setTimeout(() => , 1000)
    if (ControllinoSerialPort) {
      // ═══════════════════════════════════════════════════════════════
      console.log(`\x1b[36m╔════════════════════════════════════════╗\x1b[0m`);
      console.log(`\x1b[36m║\x1b[0m \x1b[1m\x1b[33mSERIAL WRITE → Controllino:\x1b[0m \x1b[1m\x1b[32m${mes}\x1b[0m`);
      console.log(`\x1b[36m╚════════════════════════════════════════╝\x1b[0m`);
      // ═══════════════════════════════════════════════════════════════
      sendSerial(mes);
    } else {
      emitter.emit(`cmdFailedEvent`, `no serial port 1`);
      return;
    }
    nbrOfComdOngoing++;
    //console.log(`cmd1: ` + mes + `, `+nbrOfComdOngoing.toString());

    let intervalId = setInterval(() => {
      if (fAnswerReceived1) {
        //  console.log(`fAnswerReceived` + input1.toString());
        clearInterval(intervalId);
        comptCmd1--;
        // console.log(`Clear Timeout 1: ` + comptCmd1.toString());
        //case of several command sent in the same timeout
        clearTimeout(timeoutIdTab1[comptCmd1]);

        resolve(input1);
      }
    }, 100);

    timeoutId = setTimeout(() => {
      emitter.emit(`cmdFailedEvent`, `no answer from arduino1`);
      comptCmd1--;
      reject;
    }, 2000);
    timeoutIdTab1[comptCmd1++] = timeoutId;
  });

  let result = await promise; // wait until the promise resolves (*)

  return input1;
}

function manageInputEvent(mes, input) {
  var a = parseInt(Number(`0x` + input), 10); //attention 10 ? il faut un mot de 16bits

  if (mes == `21`) {
    //answer to getinput 1
    input1 = a;
    fAnswerReceived1 = true;
    return;
  }

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
          fAnswerReceived1 = true;
          //answer received, stop timer
          if (nbrOfComdOngoing > 1) {
            nbrOfComdOngoing--;
          } else {
            clearTimeout(timeoutId);
            timeoutId = 0;
            nbrOfComdOngoing = 0;
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
        //case of get input answer
        if (nbrOfComdOngoing > 1) {
          nbrOfComdOngoing--;
        } else {
          clearTimeout(timeoutId);
          timeoutId = 0;
          nbrOfComdOngoing = 0;
        }

        //just to detect answer
        statusCmd1 = tempBuffer1.substring(0, 1);

        //just to detect answer
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
  console.log(`[${getCurrentTime()}]   TURNING ON CELL LIGHT.`);
  sendCmd1(`O` + OUTPUT_POWER_CELL + OUT_ON);
}

function powerOffCell(val) {
  console.log(`[${getCurrentTime()}]   TURNING OFF CELL LIGHT.`);
  sendCmd1(`O` + OUTPUT_POWER_CELL + OUT_OFF);
}

// protocol 0xxY xx= output Y=color, W if state =0
function set_output(num, val, color = 'w') {
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

  // New protocol: O{NN}{0|1}{color}
  sendCmd1(`O` + n + c);
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
  console.log(`[ARDUINO] Bar LED → ${val}%`);
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
  setBarled,
};
