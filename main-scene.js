/*======================================Game Paramaters =======================================================*/
 const NUM_OF_PLAYERS = 2;
 const PLAYER_MASS = 0.1;
 const g = -9.8;
 const MAX_X_VELOCITY = 20; // m/s
 const MU = 2;
 const PROJECTILE_VEL = 7;
 const MAX_X_POS = 7;
 const MIN_Y_POS = -5;
 // For introduction
const INTRO_BEGIN = 0;
const ZOOM_TO_SIDE = 1
const INTRO_FINAL_CAMERA = 2;
const INTRO_END = 3;
/*==============================================================================================================*/


window.Main_Scene = window.classes.Main_Scene =
class Main_Scene extends Scene_Component
  { constructor( context, control_box )
      { super(   context, control_box );       
        //context.globals.graphics_state.camera_transform = Mat4.translation([0,-1.5,0]).times(Mat4.look_at( Vec.of( 0,0,7 ), Vec.of( 0,-2,0 ), Vec.of( 0,1,0 ) ));

        //This camera is good for debugging collisions
       // context.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( -2.5,-1.5,7 ), Vec.of( -2.5,1.5,0 ), Vec.of( 0,1,0 ) );
     // This camera looks good

        // Set our intial view by working backwards from what we want 
        this.game_view = Mat4.look_at( Vec.of( 0,0,7 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) )
                                                          .times(Mat4.translation([0,1,-15]))
                                                          .times(Mat4.rotation(Math.PI/2, [0,1,0]))
                                                          .times(Mat4.rotation(-Math.PI/2, [1,0,0]));
        context.globals.graphics_state.camera_transform = this.game_view;
        this.desired = this.game_view

        const r = context.width/context.height;

        context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );

        this.delta_t = 0;

        var shapes = { 
                         platform: new platform(),
                         bg: new background(),
                         bounding_box: new Cube(),
                         lock: new Shape_From_File( "/assets/lock.obj" ),

                         // Player shapes
                          silo : new silo(),
                          log : new log(),

                          // For background
                          tower_pc : new Shape_From_File("/assets/tower_pc.obj")
                       }

        //shapes.stage.texture_coords = shapes.stage.texture_coords.map(v => Vec.of(v[0]*3, v[1]*3)); //Scale the texture of the stage to make it look a bit nicer                   
        this.submit_shapes( context, shapes );

        this.materials =
          { 
            white: context.get_instance( Phong_Shader ).material( Color.of( 1,1,1,1 ) ),
            end_screen: context.get_instance( Phong_Shader ).material( Color.of( 0,0,0,1 ), {ambient: 1, texture: context.get_instance( "assets/end.png",false )}),
            player: context.get_instance( Phong_Shader ).material( Color.of( 255/255, 175/255, 175/255, 1 ) ),
            bounding_box: context.get_instance( Phong_Shader ).material( Color.of( 255/255, 175/255, 175/255, 0.2 )),
            lock: context.get_instance( Fake_Bump_Map ).material( Color.of( 0.5,0.5,0.5,1), { ambient: .3, diffusivity: .5, specularity: .5}),
            pcb_t: context.get_instance( Phong_Shader ).material( Color.of( 0,0,0,1 ), {ambient: 1, texture: context.get_instance( "assets/pcb.png", false ) } ), //Circuitboard texture for main platform
            bg_t: context.get_instance( Texture_Scroll_XY ).material( Color.of( 0,0,0,1 ), {ambient: 1, texture: context.get_instance( "assets/starfield.png", false ) } ), //Background, scrolls on an axis to create the illusion of flying through space

            // For background
            tower: context.get_instance( Fake_Bump_Map ).material( Color.of( 0.5,0.5,0.5,1), { ambient: .3, diffusivity: .5, specularity: .5}),

          }

        this.not_paused = true;
        this.draw_platforms = false;
        
        this.platform_bb = //Coordinates for platform bounding boxes, used when checking for 
          {
            main_platform: new rect( Vec.of(0,-2), 8, 0.2 ),
            upper_left_platform: new rect( Vec.of(-2.5,-0.5), 2, 0.1 ),
            upper_right_platform: new rect( Vec.of(2.5, -0.5), 2, 0.1 ),
            right_corner: new rect(Vec.of(-3.9,1.9), 2, 1)
          }
        const player_shapes = {silo : this.shapes.silo, log : this.shapes.log, bounding_box: this.shapes.bounding_box}
        this.lights = [ new Light( Vec.of( -5,5,5,1 ), Color.of( 0,1,1,1 ), 100000 ) ];

        // Create two players
        const p1mats = 
        {
          left_arm: context.get_instance( Phong_Shader ).material( Color.of( 10/255, 190/255, 10/255, 1 ) ),
          right_arm: context.get_instance( Phong_Shader ).material( Color.of( 10/255, 190/255, 10/255, 1 ) ),
          left_leg: context.get_instance( Phong_Shader ).material( Color.of( 10/255, 190/255, 10/255, 1 ) ),
          right_leg: context.get_instance( Phong_Shader ).material( Color.of( 10/255, 190/255, 10/255, 1 ) ),
          body: context.get_instance( Phong_Shader ).material( Color.of( 10/255, 190/255, 10/255, 1 ) )
        }
        const p2mats =
        {
          left_arm: context.get_instance( Phong_Shader ).material( Color.of( 70/255, 175/255, 175/255, 1 ) ),
          right_arm: context.get_instance( Phong_Shader ).material( Color.of( 70/255, 175/255, 175/255, 1 ) ),
          left_leg: context.get_instance( Phong_Shader ).material( Color.of( 70/255, 175/255, 175/255, 1 ) ),
          right_leg: context.get_instance( Phong_Shader ).material( Color.of( 70/255, 175/255, 175/255, 1 ) ),
          body: context.get_instance( Phong_Shader ).material( Color.of( 70/255, 175/255, 175/255, 1 ) )
        }
        this.players = [new player(-2,1,0.1,player_shapes, p1mats, 1),
                        new player(2,1,0.2, player_shapes, p2mats, 2)];
        this.players[0].pdir = 1; //Default projectile direction to face the other player
        this.players[1].pdir = -1; //Default projectile direction to face the other player
        // Display health
        var usersec1 = document.getElementById('HP1');
        this.td1 = usersec1.getElementsByTagName('p')[0];
        var usersec2 = document.getElementById('HP2');
        this.td2 = usersec2.getElementsByTagName('p')[0];
        this.td1.innerHTML = "P1 HP: " + this.players[0].hp + "%";
        this.td2.innerHTML = "P2 HP: " + this.players[1].hp + "%";
        
      // TODO: Put this in dependencies to clean up?
      document.addEventListener( "keydown",   e => 
      {
        // Do nothing if the event was already processed
        //if (event.defaultPrevented) return;
        if (e.key == 'a')
        {   
            if (this.players[0].velocity[0] < -MAX_X_VELOCITY)
                return;

            this.players[0].mdir = -1;
            this.players[0].F[0] -= 700*this.players[0].mass;
        }
        if (e.key == 'd')
        {
            // Limit x velocity from keyboard input
            if(this.players[0].velocity[0] > MAX_X_VELOCITY) 
                  return;

            this.players[0].mdir = 1;
            this.players[0].F[0] += 700*this.players[0].mass;
        }
        if (e.key == 's'){} //No crouching ability or anything, so don't do anything
        if (e.key == 'w')
        {
          // Only allow a single jump
          if(this.players[0].jumped < 2)
          {
            if (this.players[0].jumped == 1)
              this.players[0].velocity[1] = 1;
            this.players[0].F[1] = 350*this.players[0].mass; // Set to max velocity upwards
            this.players[0].jumped += 1;
          }
        }
        if (e.key == 'c') 
        {
          this.players[0].striketime = context.globals.graphics_state.animation_time / 1000; //Used to keep track of how long to move the arm
          this.players[0].melee(this.players[1]); //Perform the melee attack
        }
        if (e.key =='v')
        {
          if (!this.players[0].shooting)
          {
            this.players[0].shooting = true;

            if (this.players[0].mdir == -1) //If facing left
               this.players[0].pdir = -1; //Then shoot to the left
            if (this.players[0].mdir == 1) //Vice-versa
              this.players[0].pdir = 1;

            this.players[0].projectile_pos = this.players[0].position.plus(Vec.of(this.players[0].pdir*this.players[0].w, 0));
            this.players[0].projectile_bb.center = this.players[0].projectile_pos; //Recalculate initially, prevents issues with subsequent hits
          }
        }

        if (e.key == 'ArrowDown'){} //No crouching ability or anything, so don't do anything

        if (e.key == 'ArrowLeft')
        {
            // Limit x velocity from keyboard input
            if(this.players[1].velocity[0] < -MAX_X_VELOCITY) 
                  return;

            this.players[1].mdir = -1;
            this.players[1].F[0] -= 700*this.players[1].mass;
        }
        if (e.key == 'ArrowRight')
        {
            // Limit x velocity from keyboard input
            if(this.players[1].velocity[0] > MAX_X_VELOCITY)
                  return;

            this.players[1].mdir = 1;
            this.players[1].F[0] += 700*this.players[1].mass;
        }
        if (e.key == 'ArrowUp')
        {
          // Only allow a single jump
          if(this.players[1].jumped < 2)
          {
            if (this.players[1].jumped == 1)
              this.players[1].velocity[1] = 1;
            this.players[1].F[1] = 350*this.players[1].mass;
            this.players[1].jumped += 1;
          }
        }
        if (e.key == 'n') //Player 2 melee
        {
          this.players[1].striketime = context.globals.graphics_state.animation_time / 1000; //Used to keep track of how long to move the arm      
          this.players[1].melee(this.players[0]); //Perform the melee attack
        }
        if (e.key == 'm') //Player 2 projectile
        {
          if (!this.players[1].shooting)
          {
            this.players[1].shooting = true;
            if (this.players[1].mdir == -1) //If facing left
              this.players[1].pdir = -1; //Then shoot to the left
            if (this.players[1].mdir == 1) //Vice-versa
              this.players[1].pdir = 1;

            this.players[1].projectile_pos = this.players[1].position.plus(Vec.of(this.players[1].pdir*this.players[1].w, 0));
            this.players[1].projectile_bb.center = this.players[1].projectile_pos;
          }
        }
        //event.preventDefault();
      }, true);

      }
    make_control_panel()
      { 
        // Add buttons to control panel
        this.key_triggered_button( "Reset Game", [ "r" ], () => 
        {
             if (this.game_over)
               this.game_over = false;
             for(var i=0; i < NUM_OF_PLAYERS; i++)
             {
                  this.players[i].position[0] = (i == 0) ? -2 : 2; 
                  this.players[i].position[1] = 1
                  this.players[i].velocity[0] = 0;
                  this.players[i].velocity[1] = 0
                  this.players[i].F[0] = 0;
                  this.players[i].F[1] = 0;
                  this.players[i].hp = 100;
                  this.players[i].bb = new rect(this.players[i].position, this.players[i].w, this.players[i].h);
                  this.players[i].transform_graph.transform_whole(Mat4.identity());
                  this.paused = false
                  this.desired = Mat4.inverse(Mat4.look_at( Vec.of( 0,0,7 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ));

             }
        });

       this.key_triggered_button( "Start Game", [ "t" ], () => 
       {
          this.intro_state = INTRO_BEGIN;
       });
        
        this.key_triggered_button( "Player 1 Taunt", [ "q" ], () => 
       {
               this.players[0].transform_graph.perform_taunt(Mat4.rotation(Math.PI/2,[1,1,0]))
       });
               this.key_triggered_button( "Player 2 Taunt", [ "/" ], () => 
       {
               this.players[1].transform_graph.perform_taunt(Mat4.rotation(Math.PI/2,[0,0,1]))
       });

        this.key_triggered_button( "Pause", [ "1" ], () => 
       {
         this.not_paused = !this.not_paused;
         this.paused_player = 0;
         if(this.not_paused)
                this.desired = Mat4.inverse(Mat4.look_at( Vec.of( 0,0,7 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ));
       });

        this.key_triggered_button( "Pause", [ "\\" ], () => 
       {
         this.not_paused = !this.not_paused;
         this.paused_player = 1;

         if(this.not_paused)
                this.desired = Mat4.inverse(Mat4.look_at( Vec.of( 0,0,7 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ));
       });

      this.key_triggered_button( "Toggle Platforms", [ "b" ], () => 
       {
                this.draw_platforms = !this.draw_platforms;
       });
        


      }

    display( graphics_state )
      { graphics_state.lights = this.lights;        // Use the lights stored in this.lights.
       
       // TODO: Comment for real timer 
       const t = graphics_state.animation_time / 1000;// dt = graphics_state.animation_delta_time / 1000;

       // For debugging, so animation does not jump between breakpoints
        var dt = 1.5 / 100;
        if(!this.not_paused) {
          dt = 0
          let p_index = this.paused_player;
          this.desired = Mat4.translation([this.players[p_index].position[0], this.players[p_index].position[1], 2]);
        }


        // Parabola for hitting camera
        // These are quadratic parametric equations to move from (x,y,0) -> (~0,~0,7) where camera is
        var s = (t, x, y, s) => Vec.of( -x/2*t*s, (5-y)/5*t**2*s, 7/2*t*s );
        var s2 = (t, x, y, s) => Vec.of( -x/2*t*s, -1*((5-y)/5*(t-2)**2*s - (5-y)/5)*t**2*s, 7/2*t*s );


        var model_transform =  Mat4.identity()

        // Perform introduction
        if (this.intro_state != INTRO_END) {
          if (this.intro_state == INTRO_BEGIN) {
            this.time_begin = 0;
            this.intro_state = ZOOM_TO_SIDE;
          }
          else if (this.intro_state == ZOOM_TO_SIDE) {

            // Move to desired position        
            this.desired = Mat4.look_at( Vec.of( 0,0,7 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );
            graphics_state.camera_transform = this.desired.map( (x,i) => Vec.from( graphics_state.camera_transform[i] ).mix( x, 0.01 ) )
            
            // Introduction will be 7 seconds long 
            this.time_begin += 1/60;
            if(this.time_begin > 7) 
              this.intro_state = INTRO_FINAL_CAMERA;
          }
          else if(this.intro_state == INTRO_FINAL_CAMERA)
          {
            graphics_state.camera_transform = this.desired.map( (x,i) => Vec.from( graphics_state.camera_transform[i] ).mix( x, 0.01 ) );
            this.intro_state = INTRO_END;
            this.desired = Mat4.inverse(Mat4.look_at( Vec.of( 0,0,7 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ));
          }
        }

        // Render end of game screen
        if (this.game_over)
        {
          model_transform = model_transform.times(Mat4.scale([3,1,1]));
          this.shapes.bounding_box.draw(graphics_state, model_transform, this.materials.end_screen);
          return;
        }

        this.td1.innerHTML = "P1 HP:" + this.players[0].hp + "%";
        this.td2.innerHTML = "P2 HP: " + this.players[1].hp + "%";

        // Draw background
        model_transform = model_transform.times(Mat4.rotation(Math.PI/2,[0,1,0]))
                                         .times(Mat4.rotation(Math.PI/2,[0,0,1]))
                                         .times(Mat4.scale([6,6,5]))
                                         .times(Mat4.translation([-0.06,0,-0.2]));
        this.shapes.tower_pc.draw(graphics_state, model_transform, this.materials.tower);
        model_transform = model_transform.times(Mat4.translation([0.06,0,0.2]))
                                         .times(Mat4.scale([1/6,1/6,1/5]))
                                         .times(Mat4.rotation(-Math.PI/2,[0,0,1]))
                                         .times(Mat4.rotation(-Math.PI/2,[0,1,0]));
       
        // Draw stage
        if(!this.draw_platforms) {
                this.shapes.platform.draw(graphics_state, model_transform.times(Mat4.translation([0,-2,0])).times(Mat4.rotation(Math.PI/2, [0,1,0])).times(Mat4.scale([6,2,8])), this.materials.pcb_t);
                this.shapes.platform.draw(graphics_state, model_transform.times(Mat4.translation([2.5,-0.5,0])).times(Mat4.scale([2,1,2])), this.materials.white);
                this.shapes.platform.draw(graphics_state, model_transform.times(Mat4.translation([-2.5,-0.5,0])).times(Mat4.scale([2,1,2])), this.materials.white);        
        }
        if(this.draw_platforms) {
        for(let p in this.platform_bb) {
              let norm_transform = Mat4.scale([1/2,1/2,1/2]);
              let trans_transform = Mat4.translation([this.platform_bb[p].center[0], this.platform_bb[p].center[1], 0]);  
              let rect_transform = Mat4.scale([this.platform_bb[p].width, this.platform_bb[p].height, 1]);
              this.shapes.bounding_box.draw(graphics_state, model_transform.times(trans_transform).times(norm_transform).times(rect_transform), this.materials.bounding_box);
        }

        for(let p of this.players) {
              let norm_transform = Mat4.scale([1/2,1/2,1/2]);
              let trans_transform = Mat4.translation([p.bb.center[0], p.bb.center[1], 0]);  
              let rect_transform = Mat4.scale([p.bb.width, p.bb.height, 1]);
              this.shapes.bounding_box.draw(graphics_state, model_transform.times(trans_transform).times(norm_transform).times(rect_transform), this.materials.bounding_box);
        }
        }


        for(let player of this.players)
        {
            if (player.hp <= 0 && !player.hitting_camera)
              this.game_over = true; //If anyone's dead, on the next frame we'll go to the game over screen

          // Begin Physics
            var a = player.F.times(1/player.mass).plus(Vec.of(0, g));
            var dx = a.times(dt);
            player.velocity = player.velocity.plus(dx);
            if (Math.abs(player.velocity[0]) >= MAX_X_VELOCITY)
            {
              player.velocity[0] = Math.sign(player.velocity[0])*MAX_X_VELOCITY;
              dx[0] = 0;
            }
            var x = dx.plus(player.velocity).times(dt);

            let temp_pos = Vec.of((player.position[0] + x[0]/4), player.position[1] + x[1]);
            player.position = temp_pos;
            player.bb.center = player.position;
            

            // Stage collision
            // Loop through platforms and check for collisions, terminating early if one is found
            // Returns an array of collision booleans in the form [<horizontal>, <vertical>]
            let was_collision = [false, false];
            for ( let p in this.platform_bb) {
              was_collision = collisions_helper(this.platform_bb[p], player.bb);
              if(was_collision[0] || was_collision[1])
                break;
            }

            if(was_collision[1] && was_collision[0])
            {
              player.position[0] += p.width;
              player.position[1] += p.height;
            }

            // Collision in y direction 
            if(was_collision[1])
            {
               player.velocity[1] = 0;  // Velocity in y direction is now 0
               player.position[1] -= x[1];
               player.jumped = 0;  // Reset jump flag
                              // Begin friction
               if (Math.abs(player.velocity[0]) > 0)
               {
                 player.velocity[0] *= 0.9;
               }
            }

            if(player.position[1] >= 1.8)
            {
              player.velocity[1] = 0;
            }

            // collision in x direction 
            if(was_collision[0])
            {
                  player.velocity[0] *= -0.1;
                  player.velocity[1] = 0.8*player.velocity[1];
                  player.position[0] -= x[0]/4;
            }


            // Check for player on player collisions
            for(let b of this.players)
            {
              if (b == player) continue;
              let was_collision = player.is_colliding(b.bb);
              if(was_collision[0]) {
                  player.velocity[0] = player.velocity[0]*-0.3;
                  player.position[0] -= x[0]/4;
              }
              if(was_collision[1]) {
                  player.velocity[1] = player.velocity[1]*-0.3;
                  player.position[1] -= x[1];
              }

              // Projectile collision
              if (b.shooting && b != player)
              {
                //Check if projectile has collided with platforms
                let was_p_collision = [false, false];
                for ( let p in this.platform_bb) {
                  was_p_collision = collisions_helper(this.platform_bb[p], b.projectile_bb);
                  if(was_p_collision[0] || was_p_collision[1])
                  {
                    b.shooting = false;
                    break;
                  }
                }
                //Only check player collision if the projectile didn't collide with the platforms
                if (!was_p_collision[0] && !was_p_collision[1])
                {         
                  let hit = player.is_colliding(b.projectile_bb)
                  if (hit[0])
                  {
                    player.hp -= 5;
                    player.F.plus(Vec.of(-1000,0));
                    b.shooting = false;
                  }
                }
              }

             }

            player.F[1] = 0;
            player.F[0] = 0;

            // Update projectile position and bounding boxes
            if (player.shooting)
            {
              if (Math.abs(player.projectile_pos[0]) > MAX_X_POS) //If projectile is outside of the screen space
              {
                player.shooting = false; //We're no longer shooting
              }
              player.projectile_pos[0] += player.pdir*PROJECTILE_VEL*dt; //Update position based on time and velocity
              player.projectile_bb.center = player.projectile_pos; //Update the center of the bounding box
            }
            if (player.striking && t > player.striketime + 0.5) //Check time passage, if 0.5s has passed since the melee then say we're no longer striking (resetting the arm animation)
            {
              player.striking = false;
            }
            if ((player.position[1] < MIN_Y_POS || Math.abs(player.position[0]) > MAX_X_POS + 1) && !player.hitting_camera)  //Has fallen through/significantly outside the world, set HP to 0 and trigger end of game
            {
              player.hp = 0;
              this.game_over = true;
            }

          // End Physics
            if(!this.not_paused) {
               var desired = Mat4.inverse(this.desired);
               graphics_state.camera_transform = desired.map( (x,i) => Vec.from( graphics_state.camera_transform[i] ).mix( x, 0.1 ) );
            }
            else if(this.not_paused && this.intro_state == INTRO_END) {
              var desired = Mat4.inverse(this.desired);
              graphics_state.camera_transform =  desired.map( (x,i) => Vec.from( graphics_state.camera_transform[i] ).mix( x, 0.1 ) );
            }
          

            // Draw player
            var update_player = Mat4.translation([player.position[0],player.position[1], 0]);
            var undo_update_player = Mat4.translation([-player.position[0], -player.position[1], 0]);
            var scale = 3/10; // I thought this was a good size for testing purposes

            model_transform = model_transform.times(update_player)                            // Move to player to translated position
                                           .times(Mat4.scale([scale,scale,scale]));         // Scale down

            // Draw player 
            let rotation_angle = 0.04*Math.PI/2 * Math.sin(2*Math.PI*2*t);
            if (this.not_paused)
                    player.leg_state = rotation_angle;
            else
                player.leg_state = 0;

            var last = Mat4.identity();

            if (player.hitting_camera)
            {
              // Follow parabolic path to camera
              let t = s(this.delta_t, player.position[0], player.position[1], scale);
              let t2 = s2(this.delta_t, player.position[0], player.position[1], scale);
              if (this.delta_t < 2)
                player.transform_graph.transform_whole(Mat4.translation(t).times(Mat4.rotation(Math.PI/4*this.delta_t*2, [0,0,1])));
              else if (this.delta_t > 2 && this.delta_t <= 4)
              {
                player.transform_graph.transform_whole(Mat4.translation(t2).times(Mat4.rotation(Math.PI/4*this.delta_t*2, [0,0,1])));
              }
              else
              {
                player.hitting_camera = false;
              }
              this.delta_t += dt*100/1.5/20;
            }
            
            if(!this.draw_platforms) {
                player.transform_graph.traverse(graphics_state);
            }

            model_transform = model_transform.times(Mat4.scale([1/scale,1/scale,1/scale]))    // Undo scale
                                           .times(undo_update_player);                      // Undo translation

            if (player.shooting) //Draw the projectile
            {
              this.shapes.lock.draw(graphics_state, model_transform.times(Mat4.translation([player.projectile_pos[0],player.projectile_pos[1],0]))
                                                                   .times(Mat4.rotation(Math.PI, [0,1,1]))
                                                                   .times(Mat4.rotation(-player.pdir*Math.PI/2, [0,1,0]))
                                                                   .times(Mat4.scale([0.15,0.15,0.15])), this.materials.lock);
            }
        }
      }
  }




