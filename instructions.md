Object : focus on the first 4 levels of round 1 and implement the following modifications and features :


-introduce a goal points to achieve per level in order to be able to proceed to the next level.
if level not achieved , the level starts again , if level points achived and got reduced due to penalties , we are still allowed to proceed , achieving the required points acts as a trigger.
- there is no negative scores.
- goal checking is used with local score not cummulative score.
- if level duration is elapsed and next level was not yet triggered , do not reset local score , if not on next level local score is reset.



level 1 : 
goal 1000 points
duration : 30 sec
mission: Touchez uniquement les verts et les bleus !
hits : +60 points Green , +80 points Blue
we turn on (1,2,3,4) in Green , and (5,6,7,8) in Blue


level 2 : 
goal 1200 points 
duration : 30 sec
mission: Touchez uniquement les verts. Évitez les rouges !
hits : +50 points
penalty : -100 points
we turn on (1,2,3,4) in green , the other 4 in Red



level 3 : 
goal 1400 points
duration : 30 sec
mission: Touchez uniquement les bleus !
hits : +90 points Blue
penalty : -100 points
we turn on (1,2,3,4) in RED , and (5,6,7,8) in Blue

level 4 : 
goal 1600 points
duration : 30 sec
mission: Touchez uniquement les verts !
hits : +80 points Green
penalty : -100 points
we turn on (1,2,3,4) in GREEN but they will be turned on one by one , only one at a time randomly each 2sec (on for 2sec then off) , and (5,6,7,8) in RED 

level 5 : 
goal 1800 points
duration : 30 sec
mission: Touchez uniquement les verts et les bleus !
hits : +90 points Green +100 Blue
penalty : -100 points
we turn on (1,2,3,4) in Green , and (5,6,7,8) in Blue but they will be turned on one by one , only one at a time randomly each 2sec (on for 2sec then off) (at any given moment 2 will be on one green and one blue then off then randomly select another 2)


level 6 : 
goal 2000 points
duration : 30 sec
mission: Touchez uniquement les Bleus !
hits : +110 points Green
penalty : -100 points
we turn on (5,6,7,8) in Blue but they will be turned on one by one , only one at a time randomly each 2sec (on for 2sec then off) , and (1,2,3,4) in RED (at any given moment 2 will be on one blue and all the rest red then after select another blue from the blue list)


level 7 : 
goal 2200 points 
duration : 30 sec
mission: Touchez 2 fois la même cible verte. Évitez les rouges !
hits : +120 points (only if he touches 2 times)
penalty : -100 points
we turn on (1,2,3,4) in green , the other 4 in Red

level 8 : 
goal 2300 points 
duration : 30 sec
mission: Touchez 2 fois la même cible blue. Évitez les rouges !
hits : +120 points (only if he touches 2 times)
penalty : -100 points
we turn on (5,6,7,8) in green , the other 4 in Red

level 9 : 
goal 2500 points 
duration : 30 sec
mission: Touchez 3 fois la même cible verte. Évitez les rouges !
hits : +130 points (only if he touches 3 times)
penalty : -100 points
we turn on (1,2,3,4) in green , the other 4 in Red

level 10 : 
goal 2700 points 
duration : 30 sec
mission: Touchez 3 fois la même cible blue. Évitez les rouges !
hits : +130 points (only if he touches 3 times)
penalty : -100 points
we turn on (5,6,7,8) in green , the other 4 in Red















