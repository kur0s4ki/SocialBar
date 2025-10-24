#ifndef TROU_H_
#define TROU_H_

#include <stdint.h>

#define _GREEN_ 1
#define _BLUE_  2
#define _RED_   3
#define _BLACK_ 4
#define _YELLOW_ 5

#define DEFAULT_VAL HIGH

#define OUTPUT0  0    //D0
#define OUTPUT1  1    //D1
#define OUTPUT2  2    //D2
#define OUTPUT3  3    //D3
#define OUTPUT4  4    //D4
#define OUTPUT5  5    //D5 
#define OUTPUT6  6    //D6
#define OUTPUT7  7    //D7 
#define OUTPUT8  8    //D8
#define OUTPUT9  9    //D9
#define OUTPUT10 10   //D10
#define OUTPUT11 11   //D11
#define OUTPUT12 12   //D12
#define OUTPUT13 13   //D13
#define OUTPUT14 14   //D14
#define OUTPUT15 15   //D15
#define OUTPUT16 16   //D16
#define OUTPUT17 17   //D17
#define OUTPUT18 18   //D18
#define OUTPUT19 19   //D19
 

#define NUM_LEDS    300 //240

#define GrandTrou_LEDS 60 
#define MoyenTrou_LEDS 60
#define PetitTrou_LEDS 60

#define GAUCHE -1
#define DROITE  1
#define MILIEU  0

void sendInput(uint8_t in);
uint16_t getInputState();
void setOutput(uint8_t out, bool val);
void powerLedsOff();
void power_off_central_leds();
void central_bonus_animation(); 
void fill_RGB(uint8_t start, uint8_t finish,uint8_t color);
void setTrou(uint8_t trou_N,uint8_t color);
void update_redTrou();
void check_command();
void check_input();


#endif
