#include "Trou.h"
#include <Arduino.h>
#include <Controllino.h>
#include <FastLED.h>
#include <string.h>



CRGB leds_A[NUM_LEDS];
CRGB leds_B[NUM_LEDS];
CRGB leds_C[NUM_LEDS];
uint8_t RedTrou[8] = {0}; // if 1--> trou is red , if 0--> trou is black
uint8_t RedTrou_state[8] = {0}; // the list of 
bool Botton_ON = false;
uint16_t in = 0;

bool Fin0 = false;
bool Fin1 = false;
bool Fin2 = false;
bool Fin3 = false;
bool Fin4 = false;
bool Fin5 = false;
bool Fin6 = false;
bool Fin7 = false;
bool Fin8 = false;
bool Fin9  = false;
bool Fin10 = false;
bool Fin11 = false;
bool Fin12 = false;
bool Fin13 = false;
bool Fin14 = false;





void sendInput(uint16_t in_)
{
  uint8_t value1 = (in_>>8) & 0xFF;
  uint8_t value2 = in_ & 0xFF;
  if(value1 < 0x10)
    Serial.print("0");
  Serial.print(value1,HEX);
  if(value2 < 0x10)
    Serial.print("0");
  Serial.print(value2,HEX);
}


uint16_t getInputState()
{
   in=0;
if (digitalRead(CONTROLLINO_A0))  in |= 0x0001;
if (digitalRead(CONTROLLINO_A1))  in |= 0x0002;
if (digitalRead(CONTROLLINO_A2))  in |= 0x0004;
if (digitalRead(CONTROLLINO_A3))  in |= 0x0008;
if (digitalRead(CONTROLLINO_A4))  in |= 0x0010;
if (digitalRead(CONTROLLINO_A5))  in |= 0x0020;
if (digitalRead(CONTROLLINO_A6))  in |= 0x0040;
if (digitalRead(CONTROLLINO_A7))  in |= 0x0080;
if (digitalRead(CONTROLLINO_A8))  in |= 0x0100;
if (digitalRead(CONTROLLINO_A9))  in |= 0x0200;
if (digitalRead(CONTROLLINO_A10)) in |= 0x0400;
if (digitalRead(CONTROLLINO_A11)) in |= 0x0800;
if (digitalRead(CONTROLLINO_A12)) in |= 0x1000;
if (digitalRead(CONTROLLINO_A13)) in |= 0x2000;
if (digitalRead(CONTROLLINO_A14)) in |= 0x4000;  

 return in;
}


void setOutput(uint8_t out, bool val)
{

  switch(out)
  {
     case OUTPUT0:
        digitalWrite(CONTROLLINO_D0, val); 
        break;
     case OUTPUT1:
        digitalWrite(CONTROLLINO_D1, val); 
        break;
     case OUTPUT5:
        digitalWrite(CONTROLLINO_D5, val);  // sets Digital Output to HIGH -> turns the LED ON         
        break;
      case OUTPUT6:
        digitalWrite(CONTROLLINO_D6, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT7:
        digitalWrite(CONTROLLINO_D7, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT8:
        digitalWrite(CONTROLLINO_D8, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT9:
        digitalWrite(CONTROLLINO_D9, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT10:
        digitalWrite(CONTROLLINO_D10, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT11:
        digitalWrite(CONTROLLINO_D11, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT12:
        digitalWrite(CONTROLLINO_D12, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT13:
        digitalWrite(CONTROLLINO_D13, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT14:
        digitalWrite(CONTROLLINO_D14, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT15:
        digitalWrite(CONTROLLINO_D15, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT16:
        digitalWrite(CONTROLLINO_D16, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT17:
        digitalWrite(CONTROLLINO_D17, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT18:
        digitalWrite(CONTROLLINO_D18, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;
      case OUTPUT19:
        digitalWrite(CONTROLLINO_D19, val);  // sets Digital Output to HIGH -> turns the LED ON
        break;

  }

}


void powerLedsOff()
{
  FastLED.clear(); 
  FastLED.show();
}


void power_off_central_leds()
{
  setTrou(9,_BLACK_);
  setTrou(10,_BLACK_);
  setTrou(11,_BLACK_);
  setTrou(12,_BLACK_);
  setTrou(13,_BLACK_);
  FastLED.show();
}


void central_bonus_circular_animation()
{
  setTrou(9,_YELLOW_);
  delay(120);
  setTrou(10,_YELLOW_);
  delay(120);
  setTrou(11,_YELLOW_);
  delay(120);
  setTrou(12,_YELLOW_);
  delay(120);
  setTrou(13,_YELLOW_);
  delay(120);

}



void check_command()
{
  if (Serial.available() >=5 ) {
          // read the incoming byte:
          //Serial.println("DATA available");
      if(Serial.peek()=='O')
      {    
        if (Serial.read()=='O')
          { 
            //Serial.println("O");
           uint8_t incomingByte = Serial.read()-'0'; 
            incomingByte = incomingByte*10+(Serial.read()-'0');
            //Serial.println(incomingByte,DEC);
  
            if(incomingByte == 99)
              digitalWrite(CONTROLLINO_R0, HIGH);

            else if (((incomingByte>=1) && (incomingByte<=13)))
            {
              if(Botton_ON)
              {
                
                digitalWrite(CONTROLLINO_D0, HIGH);
                digitalWrite(CONTROLLINO_D1, LOW);
                Botton_ON = false;

              }
                            
              char state= Serial.read();
             char color = Serial.read();
             //Serial.println(state);Serial.println(state);
              if (state == '1')
              {
                
                if(color == 'r' || color == 'R')
                {
                   //RedTrou[incomingByte-1] = 1;
                   //RedTrou_state[incomingByte-1] = 1;
                  
                  setTrou(incomingByte,_RED_);
                  Serial.println("O1");
                }                 
                else if (color == 'g' || color == 'G')
                {
                  // if(RedTrou[incomingByte-1] == 1)
                  // {
                  //   RedTrou[incomingByte-1] = 0;
                  //   RedTrou_state[incomingByte-1] = 0;
                  // }
                  setTrou(incomingByte,_GREEN_);
                  Serial.println("O1");
                }
                else if (color == 'b' || color == 'B')
                {
                  // if(RedTrou[incomingByte-1] == 1)
                  // {
                  //   RedTrou[incomingByte-1] = 0;
                  //   RedTrou_state[incomingByte-1] = 0;
                  // }
                  setTrou(incomingByte,_BLUE_);
                  Serial.println("O1");
                }                    
                else if (color == 'y' || color == 'Y')
                {
                  // if(RedTrou[incomingByte-1] == 1)
                  // {
                  //   RedTrou[incomingByte-1] = 0;
                  //   RedTrou_state[incomingByte-1] = 0;
                  // }
                  setTrou(incomingByte,_YELLOW_);
                  Serial.println("O1");
                }            
                else
                {
                  while(Serial.available())
                  {
                    Serial.read();
                  }
                  Serial.print("O0");
                  return;
                }
                  
              }
              else
              {
                
                setTrou(incomingByte,_BLACK_);
                Serial.println("O1");
              }
                              
                    
            }
            else if (((incomingByte>=14) && (incomingByte<=28)))
            {
              if(!Botton_ON)
              {
                digitalWrite(CONTROLLINO_D0, LOW);
                digitalWrite(CONTROLLINO_D1, HIGH);
                Botton_ON = true;
              }
              
              char state= Serial.read();
              char color = Serial.read();
              if (state == '1')
              {
                switch(incomingByte)
                {
                  case 14: digitalWrite(CONTROLLINO_D5, HIGH);break;
                  case 15: digitalWrite(CONTROLLINO_D6, HIGH); break;
                  case 16: digitalWrite(CONTROLLINO_D7, HIGH);break;
                  case 17: digitalWrite(CONTROLLINO_D8, HIGH); break;
                  case 18: digitalWrite(CONTROLLINO_D9, HIGH); break;
                  case 19: digitalWrite(CONTROLLINO_D10, HIGH); break;
                  case 20: digitalWrite(CONTROLLINO_D11, HIGH); break;
                  case 21: digitalWrite(CONTROLLINO_D12, HIGH); break;
                  case 22: digitalWrite(CONTROLLINO_D13, HIGH); break;
                  case 23: digitalWrite(CONTROLLINO_D14, HIGH); break;
                  case 24: digitalWrite(CONTROLLINO_D15, HIGH); break;
                  case 25: digitalWrite(CONTROLLINO_D16, HIGH); break;
                  case 26: digitalWrite(CONTROLLINO_D17, HIGH); break;
                  case 27: digitalWrite(CONTROLLINO_D18, HIGH); break;
                  case 28: digitalWrite(CONTROLLINO_D19, HIGH);
                  
                }
                
              }
              else
              {
                switch(incomingByte)
                {
                case 14: digitalWrite(CONTROLLINO_D5, LOW);break;
                  case 15: digitalWrite(CONTROLLINO_D6, LOW); break;
                  case 16: digitalWrite(CONTROLLINO_D7, LOW);break;
                  case 17: digitalWrite(CONTROLLINO_D8,LOW); break;
                  case 18: digitalWrite(CONTROLLINO_D9, LOW); break;
                  case 19: digitalWrite(CONTROLLINO_D10, LOW); break;
                  case 20: digitalWrite(CONTROLLINO_D11, LOW); break;
                  case 21: digitalWrite(CONTROLLINO_D12, LOW); break;
                  case 22: digitalWrite(CONTROLLINO_D13, LOW); break;
                  case 23: digitalWrite(CONTROLLINO_D14, LOW); break;
                  case 24: digitalWrite(CONTROLLINO_D15, LOW); break;
                  case 25: digitalWrite(CONTROLLINO_D16, LOW); break;
                  case 26: digitalWrite(CONTROLLINO_D17, LOW); break;
                  case 27: digitalWrite(CONTROLLINO_D18, LOW); break;
                  case 28: digitalWrite(CONTROLLINO_D19, LOW);
              }
            }
                              
              Serial.print("O1");  
            }
            
          }  
          
        }
               
  }
 
}



void fill_RGB(int8_t Position,uint8_t start,uint8_t finish,uint8_t color)
{   
      if(Position == GAUCHE)
      { 
         for(int x=start;x<=finish;x++)
         {
            switch (color)
          {
            case _GREEN_ : leds_A[x] = CRGB::Green;break;
            case _BLUE_  : leds_A[x] = CRGB::Blue;break;
            case _RED_   : leds_A[x] = CRGB::Red;break;
            case _YELLOW_: leds_A[x] = CRGB::Yellow;break;
            case _BLACK_ : leds_A[x] = CRGB::Black;
          }
         }
         
          
      }
        
      else if(Position == DROITE)
      {
         for(int x=start;x<=finish;x++)
         {
          switch (color)
          {
            case _GREEN_ : leds_B[x] = CRGB::Green;break;
            case _BLUE_  : leds_B[x] = CRGB::Blue;break;
            case _RED_   : leds_B[x] = CRGB::Red;break;
            case _YELLOW_: leds_B[x] = CRGB::Yellow;break;
            case _BLACK_ : leds_B[x] = CRGB::Black;
          }
         }
      }

      else 
      {
         for(int x=start;x<=finish;x++)
         {
          switch (color)
          {
            case _GREEN_ : leds_C[x] = CRGB::Green;break;
            case _BLUE_  : leds_C[x] = CRGB::Blue;break;
            case _RED_   : leds_C[x] = CRGB::Red;break;
            case _YELLOW_: leds_C[x] = CRGB::Yellow;break;
            case _BLACK_ : leds_C[x] = CRGB::Black;
          }
         }
      }      
    
      FastLED.show();
    
    
}
void setTrou(uint8_t trou_N,uint8_t color)
{

  switch (trou_N)
  {
    case 1 : fill_RGB(GAUCHE,0,GrandTrou_LEDS-1,color);break;
    case 6 : fill_RGB(GAUCHE,GrandTrou_LEDS,GrandTrou_LEDS+MoyenTrou_LEDS-1,color);break;
    case 2 : fill_RGB(GAUCHE,GrandTrou_LEDS+MoyenTrou_LEDS,GrandTrou_LEDS+(2*MoyenTrou_LEDS)-1,color);break;
    case 5 : fill_RGB(GAUCHE,GrandTrou_LEDS+(2*MoyenTrou_LEDS),(2*GrandTrou_LEDS)+(2*MoyenTrou_LEDS)-1,color);break;
    case 4 : fill_RGB(DROITE,0,MoyenTrou_LEDS-1,color);break;
    case 7 : fill_RGB(DROITE,MoyenTrou_LEDS,GrandTrou_LEDS+MoyenTrou_LEDS-1,color);break;
    case 3 : fill_RGB(DROITE,GrandTrou_LEDS+MoyenTrou_LEDS,(2*GrandTrou_LEDS)+MoyenTrou_LEDS-1,color);break;
    case 8 : fill_RGB(DROITE,(2*GrandTrou_LEDS)+MoyenTrou_LEDS,(2*GrandTrou_LEDS)+(2*MoyenTrou_LEDS)-1,color);break;
    case 9 : fill_RGB(MILIEU,0,PetitTrou_LEDS-1,color);
             fill_RGB(MILIEU,PetitTrou_LEDS,(2*PetitTrou_LEDS)-1,color);
             fill_RGB(MILIEU,(2*PetitTrou_LEDS),(3*PetitTrou_LEDS)-1,color);
             fill_RGB(MILIEU,(3*PetitTrou_LEDS),(4*PetitTrou_LEDS)-1,color);
             fill_RGB(MILIEU,(4*PetitTrou_LEDS),(5*PetitTrou_LEDS)-1,color);break;
    //case 10: fill_RGB(MILIEU,PetitTrou_LEDS,(2*PetitTrou_LEDS)-1,color);break;
    //case 11: fill_RGB(MILIEU,(2*PetitTrou_LEDS),(3*PetitTrou_LEDS)-1,color);break;
    //case 12: fill_RGB(MILIEU,(3*PetitTrou_LEDS),(4*PetitTrou_LEDS)-1,color)           
    //case 13: fill_RGB(MILIEU,(4*PetitTrou_LEDS),(5*PetitTrou_LEDS)-1,color);
  }



}


void update_redTrou()
{
  for(int i = 0 ; i<sizeof(RedTrou); i++)
    {
      if(RedTrou[i] == 1)
      {
        if(RedTrou_state[i] == 1)
        {
          setTrou(i+1,_BLACK_);
          RedTrou_state[i+1] = 0;
        }
         
        else 
        {
          setTrou(i+1,_RED_);
          RedTrou_state[i+1] = 1;
        }
          
      }
    }

}



void check_input()
{
  if (digitalRead(CONTROLLINO_A0) == DEFAULT_VAL) {  
      if (Fin0==false)
      {
        delay(3);
         if (digitalRead(CONTROLLINO_A0)==DEFAULT_VAL) {
          getInputState();
          if(Botton_ON)
            Serial.print("I14");
          else
            Serial.print("I01");
          sendInput(in);
          Fin0=true;
         }
      }
    }
    else
    {
      if (Fin0){
        delay(3);
        Fin0=false;
      }
    }
       
    if(digitalRead(CONTROLLINO_A1)==DEFAULT_VAL) {
      if (Fin1==false)
      {
         delay(3);
         if (digitalRead(CONTROLLINO_A1)==DEFAULT_VAL) {
           getInputState();
          if(Botton_ON)
            Serial.print("I15");
          else
            Serial.print("I06");
          sendInput(in);
          Fin1=true;
         }
      }
    }
    else
    {
      if (Fin1)
      {
        delay(3);
        Fin1=false;
      }
    }
     
    if(digitalRead(CONTROLLINO_A2)==DEFAULT_VAL) {
      if (Fin2==false)
      {
         delay(3);
         if (digitalRead(CONTROLLINO_A2)==DEFAULT_VAL) {
           getInputState();
          if(Botton_ON)
            Serial.print("I16");
          else
            Serial.print("I04");
          sendInput(in);
          Fin2=true;
         }
      }
    }
    else
    {
      if (Fin2)
      {
        delay(3);
        Fin2=false;
      }
    }

    if(digitalRead(CONTROLLINO_A3)==DEFAULT_VAL) {
      if (Fin3==false)
      {
         delay(3);
         if (digitalRead(CONTROLLINO_A3)==DEFAULT_VAL) {
           getInputState();
          if(Botton_ON)
            Serial.print("I17");
          else
            Serial.print("I07");
          sendInput(in);
          
          Fin3=true;
         }
      }
    }
    else
    {
      if (Fin3)
      {
        delay(3);
        Fin3=false;
      }
    }



    
    if(digitalRead(CONTROLLINO_A4)==DEFAULT_VAL) {
      if (Fin4==false)
      {
         delay(3);
         if (digitalRead(CONTROLLINO_A4)==DEFAULT_VAL) {
           getInputState();
          if(Botton_ON)
            Serial.print("I18");
          else
            Serial.print("I02");
          sendInput(in);
          Fin4=true;
         }
      }
    }
    else
    {
      if (Fin4)
      {
        delay(3);
        Fin4=false;
      }
    }

    
    if(digitalRead(CONTROLLINO_A5)==DEFAULT_VAL) {
      if (Fin5==false)
      {
         delay(3);
         if (digitalRead(CONTROLLINO_A5)==DEFAULT_VAL) {
           getInputState();
          if(Botton_ON)
            Serial.print("I19");
          else
            Serial.print("I05");
          sendInput(in);
          Fin5=true;
         }
      }
    }
    else
    {
      if (Fin5)
      {
        delay(3);
        Fin5=false;
      }
    }


    
    if(digitalRead(CONTROLLINO_A6)==DEFAULT_VAL) {
      if (Fin6==false)
      {
         delay(3);
         if (digitalRead(CONTROLLINO_A6)==DEFAULT_VAL) {
           getInputState();
          if(Botton_ON)
            Serial.print("I20");
          else
            Serial.print("I03");
          sendInput(in);
          
          Fin6=true;
         }
      }
    }
    else
    {
      if (Fin6)
      {
        delay(3);
        Fin6=false;
      }
    }

    
    if(digitalRead(CONTROLLINO_A7)==DEFAULT_VAL) {
      if (Fin7==false)
      {
         delay(3);
         if (digitalRead(CONTROLLINO_A7)==DEFAULT_VAL) {
           getInputState();
          if(Botton_ON)
            Serial.print("I21");
          else
            Serial.print("I08");
          sendInput(in);
          
          Fin7=true;
         }
      }
    }
    else
    {
      if (Fin7)
      {
        delay(3);
        Fin7=false;
      }
    }

    if(digitalRead(CONTROLLINO_A8)==DEFAULT_VAL) {
      if (Fin8==false)
      {
         delay(3);
         if (digitalRead(CONTROLLINO_A8)==DEFAULT_VAL) {
           getInputState();
          if(Botton_ON)
            Serial.print("I22");
          else
            Serial.print("I09");
          sendInput(in);
          
          Fin8=true;
         }
      }
    }
    else
    {
      if (Fin8)
      {
        delay(3);
        Fin8=false;
      }
    }

// A9
if (digitalRead(CONTROLLINO_A9) == DEFAULT_VAL) {
  if (Fin9 == false) {
    delay(3);
    if (digitalRead(CONTROLLINO_A9) == DEFAULT_VAL) {
          getInputState();
          if(Botton_ON)
            Serial.print("I23");
          else
            Serial.print("I10");
          sendInput(in);
      Fin9 = true;
    }
  }
} else {
  if (Fin9) {
    delay(3);
    Fin9 = false;
  }
}

// A10
if (digitalRead(CONTROLLINO_A10) == DEFAULT_VAL) {
  if (Fin10 == false) {
    delay(13);
    if (digitalRead(CONTROLLINO_A10) == DEFAULT_VAL) {
      getInputState();
          if(Botton_ON)
            Serial.print("I24");
          else
            Serial.print("I11");
          sendInput(in);
      Fin10 = true;
    }
  }
} else {
  if (Fin10) {
    delay(3);
    Fin10 = false;
  }
}

// A11
if (digitalRead(CONTROLLINO_A11) == DEFAULT_VAL) {
  if (Fin11 == false) {
    delay(3);
    if (digitalRead(CONTROLLINO_A11) == DEFAULT_VAL) {
      getInputState();
          if(Botton_ON)
            Serial.print("I25");
          else
            Serial.print("I12");
          sendInput(in);
      Fin11 = true;
    }
  }
} else {
  if (Fin11) {
    delay(3);
    Fin11 = false;
  }
}

// A12
if (digitalRead(CONTROLLINO_A12) == DEFAULT_VAL) {
  if (Fin12 == false) {
    delay(3);
    if (digitalRead(CONTROLLINO_A12) == DEFAULT_VAL) {
      getInputState();
          if(Botton_ON)
            Serial.print("I26");
          else
            Serial.print("I13");
          sendInput(in);
      Fin12 = true;
    }
  }
} else {
  if (Fin12) {
    delay(3);
    Fin12 = false;
  }
}

// A13
if (digitalRead(CONTROLLINO_A13) == DEFAULT_VAL) {
  if (Fin13 == false) {
    delay(3);
    if (digitalRead(CONTROLLINO_A13) == DEFAULT_VAL) {
      getInputState();
            Serial.print("I27");
          sendInput(in);
      Fin13 = true;
    }
  }
} else {
  if (Fin13) {
    delay(3);
    Fin13 = false;
  }
}


// A14
if (digitalRead(CONTROLLINO_A14) == DEFAULT_VAL) {
  if (Fin14 == false) {
    delay(3);
    if (digitalRead(CONTROLLINO_A14) == DEFAULT_VAL) {
      getInputState();
          Serial.print("I28");
          sendInput(in);
      Fin14 = true;
    }
  }
} else {
  if (Fin14) {
    delay(3);
    Fin14 = false;
  }
}



}
