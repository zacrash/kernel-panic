# Kernel Panic

Term Project for CS 174A for UCLA. 

## Team Members

Brad Squicciarini: 404561839, bsquicciarini@ucla.edu

Jonathan Schultz: 104941879, jonathanaschultz1@gmail.com 

Zach Rash: 504619571, zachrash@ucla.edu


## About 


Our project is a simple recreation of the game Super Smash Bros, featuring two characters attempting to damage the other by either draining all of their hit points or pushing them off the stage. Our implementation consists of numerous advanced graphics topics, including collision/jumping physics, various mapping techniques, and a scene graph, used for maintaining the relationships between the geometry that makes up the characters.

To run the game, after hosting the server and visiting the page that the game is hosted on. Pressing "t" begins the game. Player 1 is controlled with the W, A and D keys for movement (with A and D controlling horizontal movement and W handling jumping). In terms of attacking controls, the C key launches a melee attack that will push the other character and cause damage to them if they're in range, while the V key will launch a projectile in the direction that they're facing - if that projectile strikes the other player, they'll take damage. For player 2's controls, their movement is controlled with the arrow keys, and their melee and projectile attacks are launched with the N and M keys, respectively. If a player dies or falls off the stage, the game will end, and the game can be reset with the R key.

## Contributions

### Zach Rash 
Physics Model (i.e. kinematics of players and projectiles, momentum, friction/drift, etc.) . Projectile logic. Melee logic. Collision logic. Displaying vital signs. Final animation where meleed player flies into camera along parabolic trajectory. Game over screen. Player class design.

### Brad Squicciarini
Physics model (i.e. kinematics of players). Collision logic for stage and player-on-player. Scene graph of players and animation while moving. Map creation. Player shape creation. Movement controls. Introduction animation.

### Jonathan Schultz 
Bidirectional movement/melee attack animations for players, creating the illusion of player rotation on the 2D plane without actually rotating the player model. Logic for handling player death/endgame state when players get knocked/jump outside of the screen space playing field. Data structures for processing multiple materials across shapes in the scene graph. Projectile launching/collisions based on player direction, projectile collision logic with stage objects (so that projectiles properly stop on contact with the stage). Melee/projectile logic for both players, ensuring conflict doesn't occur when both players are playing at once. Modification of scene graph constructors to better support our needs.
