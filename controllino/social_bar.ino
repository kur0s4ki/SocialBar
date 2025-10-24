#include <Controllino.h>  
#include <FastLED.h>
#include <avr/wdt.h>

#include "Trou.h"


extern CRGB leds_A[NUM_LEDS];
extern CRGB leds_B[NUM_LEDS];
extern CRGB leds_C[NUM_LEDS];

unsigned long time = millis();

void setup() {

   
   wdt_enable(WDTO_4S); // Set timeout to 4 seconds
  
   Serial.begin(9600);
  
   pinMode(CONTROLLINO_A0, INPUT);
   pinMode(CONTROLLINO_A1, INPUT);
   pinMode(CONTROLLINO_A2, INPUT);
   pinMode(CONTROLLINO_A3, INPUT);
   pinMode(CONTROLLINO_A4, INPUT);
   pinMode(CONTROLLINO_A5, INPUT);
   pinMode(CONTROLLINO_A6, INPUT);
   pinMode(CONTROLLINO_A7, INPUT);
   pinMode(CONTROLLINO_A8, INPUT);
   pinMode(CONTROLLINO_A9, INPUT);
   pinMode(CONTROLLINO_A10, INPUT);
   pinMode(CONTROLLINO_A11, INPUT);
   pinMode(CONTROLLINO_A12, INPUT);
   pinMode(CONTROLLINO_A13, INPUT);
   pinMode(CONTROLLINO_A14, INPUT);


   
   pinMode(CONTROLLINO_D0, OUTPUT); 
   pinMode(CONTROLLINO_D1, OUTPUT); 
   pinMode(CONTROLLINO_D2, OUTPUT); 
   pinMode(CONTROLLINO_D3, OUTPUT); 
   pinMode(CONTROLLINO_D4, OUTPUT); 
   pinMode(CONTROLLINO_D5, OUTPUT); 
   pinMode(CONTROLLINO_D6, OUTPUT); 
   pinMode(CONTROLLINO_D7, OUTPUT); 
   pinMode(CONTROLLINO_D8, OUTPUT); 
   pinMode(CONTROLLINO_D9, OUTPUT); 
   pinMode(CONTROLLINO_D10, OUTPUT); 
   pinMode(CONTROLLINO_D11, OUTPUT); 
   pinMode(CONTROLLINO_D12, OUTPUT); 
   pinMode(CONTROLLINO_D13, OUTPUT); 
   pinMode(CONTROLLINO_D14, OUTPUT); 
   pinMode(CONTROLLINO_D15, OUTPUT); 
   pinMode(CONTROLLINO_D16, OUTPUT); 
   pinMode(CONTROLLINO_D17, OUTPUT); 
   pinMode(CONTROLLINO_D18, OUTPUT); 
   pinMode(CONTROLLINO_D19, OUTPUT); 

   pinMode(CONTROLLINO_R0, OUTPUT); 
      
   FastLED.addLeds<WS2812B,CONTROLLINO_D2,GRB>(leds_A, NUM_LEDS); 
   FastLED.addLeds<WS2812B,CONTROLLINO_D3,GRB>(leds_B, NUM_LEDS);
   FastLED.addLeds<WS2812B,CONTROLLINO_D4,GRB>(leds_C, NUM_LEDS);

   FastLED.setBrightness(25);

   

   powerLedsOff();

   digitalWrite(CONTROLLINO_D0, HIGH);
   digitalWrite(CONTROLLINO_D1, LOW);

   wdt_reset();
    
}


void loop() {

 
        wdt_reset();
        check_command(); // check if a command was recieved 
        //delay(200);
        // if(millis()-time >=200)
        // {
        //   time = millis();
        //   update_redTrou(); // update the state of redTrou from red to black and from black to red
        // }
        check_input();
        delay(50);

  
}
