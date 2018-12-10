// Checks for collision between platform and player
// Both arguemtns are instances of axis_aligned_bb
// Returns 
function collisions_helper(body_A, body_B)
    {
      let threshold = 0.4;
      let w = (body_A.width + body_B.width)/2;
      let h = (body_A.height + body_B.height)/2;
      let dx = body_A.center[0] - body_B.center[0];
      let dy = body_A.center[1] - body_B.center[1];

      if (Math.abs(dx) <= w && Math.abs(dy) <= h)
      {
          /* collision! */
          let wy = w * dy;
          let hx = h * dx;

          if (wy > hx)
              if (wy > -hx) {
                  console.log("Bottom!")
                  return [false, true];
              }
              else {
                  console.log("Right!")
                  return [true, false];
              }
          else
              if (wy > -hx) {
                  console.log("Left!")
                  return [true, false];
              }
              else {
                  console.log("Top!")
                  return [false, true];
              }
      }
      return [false, false]
    }
// For bounding boxes
window.rect = window.classes.rect =
class rect {
   constructor(center,w,h) {
     this.center= center;
     this.width = w
     this.height = h
   }
}

// For scene graph 
window.Tree_Node = window.classes.Tree_Node =
class Tree_Node     // A node recursively stores a list of child nodes.  It also stores a model 
  {                 // matrix, broken up into its rigid part (rotation & translation) and
                    // scale part.  It also stores a Shape so we know which shape to draw.
    constructor(id, rigid_delta_matrix, scale_delta_matrix )
    { Object.assign( this, { rigid_delta_matrix, scale_delta_matrix } );
      this.children = [];
      this.shapes = [];
      this.cached_product = null;
      this.identifier = id      
    }
  }

// Player class to keep track of player information
window.player = window.classes.player =
class player extends Shape
{
  constructor(x,y,mass,shapes,materials, player_num)
  { 
  super( "positions", "normals", "texture_coords" );
    // Physics variables
    this.F = Vec.of(0,0);
    this.position = Vec.of(x, y);
    this.velocity = Vec.of(0, 0);

    this.jumped = 0;          // Avoid double jumps
    this.collided = false;
    this.hitting_camera = false;

    // THIS IS FOR COLLISIONS. It is 0.3 because in main-scene.js I scale by 0.3
    this.w = 0.6;
    this.h = 0.8;

    this.bb = new rect(this.position,this.w,this.h);

    this.shooting= false;
    this.striking= false;
    this.striketime = 0;
    this.projectile_transform = Mat4.identity();
    this.projectile_pos = this.position;
    this.projectile_bb = new rect(this.projectile_pos,0.3,0.3);

    this.pdir = 0; // Projectile launch direction - default to 0 and set proper orientation in main-scene
    this.mdir = 0; // Movement/facing direction, facilitates proper jump animation
    this.mass = mass;

    this.hp = 100;
    var scale = 3/10; // I thought this was a good size for testing purposes

    this.leg_counter = 0;
    this.leg_freq = 5; 
    this.leg_state = Math.sin(this.leg_counter*this.leg_freq);
    this.number = player_num;

    // Create tree of transforms
    var root = new Tree_Node( null, null );
    root.cached_product = Mat4.identity();	// Final matrix of root node

    // Create players root to keep track of translations and rotations
    var player_root = new Tree_Node("player_root", Mat4.translation([this.position[0],this.position[1],0]), Mat4.identity());
    root.children.push( player_root );
    var body = new Tree_Node("body", Mat4.rotation(-Math.PI/2,[1,0,0]).times(Mat4.rotation(-Math.PI/2,[0,0,1])),
     Mat4.scale([1/4,1/4,1/4]));
    body.shapes.push(shapes.silo);
    player_root.children.push( body );
    var right_arm = new Tree_Node("right_arm", Mat4.translation([-1.2,0,0]), Mat4.scale([1/2.75,1/2.75,1/2.75]));
    right_arm.shapes.push(shapes.log);
    body.children.push( right_arm );
    var left_arm = new Tree_Node("left_arm", Mat4.translation([1.2,0,0]), Mat4.scale([1/2.75,1/2.75,1/2.75]));
    left_arm.shapes.push(shapes.log);
    body.children.push( left_arm );    
    var left_leg = new Tree_Node("left_leg", Mat4.translation([0.4,0,-0.8]), Mat4.scale([1/3,1/3,1/3]));
    left_leg.shapes.push(shapes.log);
    body.children.push( left_leg );   
    var right_leg = new Tree_Node("right_leg", Mat4.translation([-0.4,0,-0.8]), Mat4.scale([1/3,1/3,1/3]));
    right_leg.shapes.push(shapes.log);
    body.children.push( right_leg );  

    // Create transform graph
    this.transform_graph = new Android_Tree(this, root, materials);
  }
  
  update_transforms()
  {
    this.transform_graph.update_position(this.position);
  }

  // Detect collision with another player, b
  is_colliding( b )
  {
    // Create bounding boxes
    return collisions_helper(this.bb, b);
  }

  melee( b )
  {
    if (this == b)
      return false;
     this.striking = true;
     if (Math.abs(this.position[0] - b.position[0]) <= 0.9)
     {
        b.hp -= 5;

       // If killed player from melee, make him hit camera
       if (b.hp <= 0)
       {
         b.hit_camera();
         return;
       }

       let delta_x = Math.sign(this.position[0] - b.position[0]); // If this is positive then we are to right of opponent and swing left
       // swing
       b.F[0] -= delta_x * 300;

      

       
     }
  }

  shoot( b,shape,graphics,model_transform,material )
  {
    if (this == b)
      return;

    shape.draw( graphics_state,model_transform,material );
     
  }

  hit_camera()
  {
    this.hitting_camera = true;
    // Send out of frame
    //this.F[1] += 300;
  }

}
     
   window.Transform_Tree = window.classes.Transform_Tree =
  class Transform_Tree                               // Organizes and navigates a tree data structure of nodes.
  { constructor(root, material)
      {
        if (typeof root != "undefined") //Make sure the variable was passed in
          this.root = root;
        if (typeof material != "undefined") //May not always have material passed in, especially when using a list of materials (which our overridden visit_node takes care of anyway)
          this.material = material;                
      }


    visit_node( node, graphics_state ) //For our purposes, won't be called since we always override visit_node but should theoretically work
    { for( let s of node.shapes ) 
        s.draw( graphics_state, node.cached_product, this.material );
    }

  traverse( graphics_state )            // How to visit every node of the scene graph.
  { const stack = [ this.root ];      // Maintain a stack for history of branches we went down.
    const traversal_indices = [ 0 ];  // Maintain another stack for how far we got in each child list.

                              // A rigid body matrix = translation and rotation parts but not scale.
    const accumulated_rigids = [ Mat4.identity() ], accumulated_scales = [ Mat4.identity() ];
    let child_rigid_with_scaled_translation = null;       // Temp value for final matrix.

    do                                // Keep going until the stack runs out of things to do.
      { const current_index = traversal_indices [  traversal_indices.length-1 ], 
                    current = stack[ stack.length-1 ],
                      scale = accumulated_scales[ accumulated_scales.length-1 ], 
                      rigid = accumulated_rigids[ accumulated_rigids.length-1 ];
        if( current_index < current.children.length )       	// Push the next child if there is one.
          { const child = current.children[ current_index ];
            stack.push( child );
            traversal_indices[ traversal_indices.length-1 ]++;
            traversal_indices.push( 0 );

            //*****************************************************
                                    // Apply a node's scale in a way that affects translations
                                    // of child nodes, but not rotations.
            child_rigid_with_scaled_translation = child.rigid_delta_matrix.copy();
            child_rigid_with_scaled_translation.forEach( (row,r) => row[3] *= scale[r][r] );

            const new_rigid = rigid.copy(), new_scale = scale.copy();

            new_rigid.post_multiply( child_rigid_with_scaled_translation );
            new_scale.post_multiply( child.scale_delta_matrix );
           
            accumulated_rigids.push( new_rigid );
            accumulated_scales.push( new_scale );
            child.cached_product = accumulated_rigids[ accumulated_rigids.length-1 ]
                           .times( accumulated_scales[ accumulated_scales.length-1 ] );
            //*****************************************************
            this.visit_node( child, graphics_state );
          }
        else     // There were no children of this child, so it's time to pop this child.
          { for( let a of [ stack, traversal_indices, accumulated_rigids, accumulated_scales ] ) a.pop();
          }
      } while( stack.length > 0 )
  }

  }

    window.Android_Tree = window.classes.Android_Tree =
  class Android_Tree extends Transform_Tree
  {
    constructor(player, root, materials) {
      super(root);
      this.materials = materials; //List of ID-mapped materials
      this.p = player;
      this.root_transform = Mat4.translation([this.p.position[0],this.p.position[1],0]);
      this.new_transform = Mat4.identity();
      this.needs_reset = false;
      this.dab_length = 0
    }

    transform_whole(transform)
    {
      this.new_transform = transform;
    }

    perform_taunt(transform)
    {
      this.dab_transform = transform;
      this.taunt = true;
      this.dab_length = 0
    }


    // Override visit_node funciton
    visit_node( node, graphics_state ){
      const t = graphics_state.animation_time / 100000;
      var model_transform = Mat4.identity(); 
      let old_transform = node.rigid_delta_matrix;
      let id = node.identifier;

      // Move whole player 
    if (id == "player_root")
    {
        node.rigid_delta_matrix = Mat4.translation([this.p.position[0],this.p.position[1],0]).times(this.new_transform);   
        
        if(this.taunt) {
          // TODO: Add player 2 taunt
          node.rigid_delta_matrix = Mat4.translation([this.p.position[0],this.p.position[1],0]).times(Mat4.rotation(Math.PI/2, [0,1,0]));
          this.needs_reset = true
          this.dab_length += 1
        }
        else if(this.needs_reset){
           node.rigid_delta_matrix = Mat4.translation([this.p.position[0],this.p.position[1],0]).times(Mat4.rotation(-Math.PI/2, [0,1,0]));
           this.needs_reset = false
        }
       
       if(this.dab_length > 20)
        this.taunt = false
        
    }

      // Animate legs
      if (id == "left_leg" )
      {
        if(Math.abs(this.p.velocity[0]) > 1.8 && !this.p.jumped){
          node.rigid_delta_matrix =  node.rigid_delta_matrix.times(Mat4.rotation(this.p.leg_state, [1,0,0]));
        }
        else{
           node.rigid_delta_matrix  = Mat4.translation([0.4,0,-0.8])
        }
      }

      // Animate legs
      if (id == "right_leg")
      {
        if(Math.abs(this.p.velocity[0]) > 1.8 && !this.p.jumped){
          node.rigid_delta_matrix=  node.rigid_delta_matrix.times(Mat4.rotation(-this.p.leg_state, [1,0,0]));
        }
        else {
           node.rigid_delta_matrix  = Mat4.translation([-0.4,0,-0.8])
        }
      }

      // Animate arms during jump and strike
      if (id == "left_arm")
      {

        if(this.taunt) {
          node.rigid_delta_matrix = Mat4.translation([0.5,-1,0.5]).times(Mat4.rotation(-7*Math.PI/5,[0,1,0]));
        }
        else if(this.p.jumped)
        {
         if(this.p.mdir == -1)
           node.rigid_delta_matrix =  Mat4.translation([1.2,1.0,-0.4]).times(Mat4.rotation(Math.PI/3, [1,0,0]));
         else
           if(this.p.striking)
             node.rigid_delta_matrix =  Mat4.translation([1.2,1.0,0]).times(Mat4.rotation(Math.PI/2, [1,0,0]));
           else
             node.rigid_delta_matrix =  Mat4.translation([1.2,-1.0,-0.4]).times(Mat4.rotation(Math.PI/3, [-1,0,0]));
        }
        else if(this.p.striking && this.p.mdir == 1)
        {
          node.rigid_delta_matrix =  Mat4.translation([1.2,1.0,0]).times(Mat4.rotation(Math.PI/2, [1,0,0]));
        }
        else {
          node.rigid_delta_matrix =  Mat4.translation([1.2,0,0]);
        }
      }

      // Animate arms during jump and strike
      if (id == "right_arm")
      {

                // Handle Dab              
        if(this.taunt) {
          node.rigid_delta_matrix = Mat4.translation([-1.5,0,1]).times(Mat4.rotation(-Math.PI/4, [0,1,0]));
        }
//         else if(this.needs_reset){
//            node.rigid_delta_matrix = Mat4.translation([this.p.position[0],this.p.position[1],0]).times(Mat4.rotation(-Math.PI/2, [0,1,0]));
//            this.needs_reset = false
//         }

        else if(this.p.jumped)
        {
         if(this.p.mdir == -1)
           if(this.p.striking)
             node.rigid_delta_matrix =  Mat4.translation([-1.2,-1.5,0]).times(Mat4.rotation(Math.PI/2, [1,0,0]));
           else
             node.rigid_delta_matrix =  Mat4.translation([-1.2,-0.7,0.4]).times(Mat4.rotation(Math.PI/3, [1,0,0]));
         else
           node.rigid_delta_matrix =  Mat4.translation([-1.2,0.7,0.4]).times(Mat4.rotation(Math.PI/3, [-1,0,0]));
        }
        else if (this.p.striking && this.p.mdir == -1)
        {
          node.rigid_delta_matrix =  Mat4.translation([-1.2,-1.5,0]).times(Mat4.rotation(Math.PI/2, [1,0,0]));          
        }
        else {
          node.rigid_delta_matrix =  Mat4.translation([-1.2,0,0]);
        }

  

      }


      for( let s of node.shapes ) {
        s.draw( graphics_state, node.cached_product, this.materials[id] );
      }
    }

  }  

window.log = window.classes.log = 
class log extends Shape 
{
  constructor(length) {
    super( "positions", "normals", "texture_coords" );
    var model_transform = Mat4.scale([1,1,3]);
    Capped_Cylinder.insert_transformed_copy_into( this, [14,14], model_transform );
    var top_cap = model_transform.times(Mat4.scale([1,1,1/3])).times(Mat4.translation([0,0,1.5])).times(Mat4.scale([0.97,0.97,0.97]));
    Subdivision_Sphere.insert_transformed_copy_into(this,[4,4],top_cap);
    var bottom_cap = model_transform.times(Mat4.scale([1,1,1/3])).times(Mat4.translation([0,0,-1.5])).times(Mat4.scale([0.97,0.97,0.97]));
    Subdivision_Sphere.insert_transformed_copy_into(this,[4,4],bottom_cap);
  }
}

window.silo = window.classes.silo = 
class silo extends Shape 
{
  constructor() {
    super( "positions", "normals", "texture_coords" );
    var model_transform = Mat4.scale([1,1,1.5]);
    Capped_Cylinder.insert_transformed_copy_into( this, [14,14], model_transform );
    var top_cap = model_transform.times(Mat4.scale([1,1,1/1.5])).times(Mat4.translation([0,0,0.75])).times(Mat4.scale([0.97,0.97,0.97]));
    Subdivision_Sphere.insert_transformed_copy_into(this,[4,4],top_cap);
  }
}


  

window.Background_Shader = window.classes.Background_Shader =
class Background_Shader extends Shader             
{                                             
  material() { return { shader: this } }
  map_attribute_name_to_buffer_name( name )
    {                                      
      return { object_space_pos: "positions", color: "colors" }[ name ];      // Use a simple lookup table.
    }
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl )
      { const [ P, C, M ] = [ g_state.projection_transform, g_state.camera_transform, model_transform ],
                      PCM = P.times( C ).times( M );
        gl.uniformMatrix4fv( gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
      }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
              varying vec4 VERTEX_COLOR;
      `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec2 inPos;
        varying   vec2 vertPos;

        void main()
        {
          vertPos = inPos;
          gl_Position = vec4( inPos, 0.0, 1.0 );
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    { return `
    varying vec2 vertPos;
    uniform sampler2D u_texture;

    void main()
    {
      vec2 texCoord = vec2( vertPos.s, -vertPos.t ) * 0.5 + 0.5;
      vec3 texColor = texture2D( u_texture, texCoord.st ).rgb;
      gl_FragColor  = vec4( texColor.rgb, 1.0 );
    }`;
    }
}

// Stage background, effectively a large XY-only cube
window.background = window.classes.background =
class background extends Shape
{
  constructor()
  {  super( "positions", "normals", "texture_coords" );
     var bg_transform = Mat4.scale([12,12,0]); //Scale it down to the XY plane only
     Cube.insert_transformed_copy_into( this, [], bg_transform );
  }
}

// Platform for simple_stage
window.platform = window.classes.platform =
class platform extends Shape   
{ constructor()  
    { super( "positions", "normals", "texture_coords" );

      var thin_platform_transform = Mat4.scale([1/2,0.05,1/2]);                     // Create a 1x0.1x1 platform
      Cube.insert_transformed_copy_into( this, [], thin_platform_transform );
    }
}

// window.bounding_box = window.classes.bounding_box =
// class bounding_box extends Shape   
// { constructor(rect)  
//     { super( "positions", "normals", "texture_coords" );

//       let norm_transform = Mat4.scale([1/2,1/2,1/2]);
//       let trans_transform = Mat4.translation([rect.center[0], rect.center[1], 0]);  
//       let rect_transform = Mat4.scale([rect.width, rect.height, 1]);
       
//       Cube.insert_transformed_copy_into( this, [], norm_transform.times(trans_transform).times(rect_transform));
//     }
// }




// FROM GARRETT
class Shape_From_File extends Shape          // A versatile standalone Shape that imports all its arrays' data from an .obj 3D model file.
{ constructor( filename )
    { super( "positions", "normals", "texture_coords" );
      this.load_file( filename );      // Begin downloading the mesh. Once that completes, return control to our parse_into_mesh function.
    }
  load_file( filename )
      { return fetch( filename )       // Request the external file and wait for it to load.
          .then( response =>
            { if ( response.ok )  return Promise.resolve( response.text() )
              else                return Promise.reject ( response.status )
            })
          .then( obj_file_contents => this.parse_into_mesh( obj_file_contents ) )
          .catch( error => { this.copy_onto_graphics_card( this.gl ); } )                     // Failure mode:  Loads an empty shape.
      }
  parse_into_mesh( data )                                           // Adapted from the "webgl-obj-loader.js" library found online:
    { var verts = [], vertNormals = [], textures = [], unpacked = {};   

      unpacked.verts = [];        unpacked.norms = [];    unpacked.textures = [];
      unpacked.hashindices = {};  unpacked.indices = [];  unpacked.index = 0;

      var lines = data.split('\n');

      var VERTEX_RE = /^v\s/;    var NORMAL_RE = /^vn\s/;    var TEXTURE_RE = /^vt\s/;
      var FACE_RE = /^f\s/;      var WHITESPACE_RE = /\s+/;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        var elements = line.split(WHITESPACE_RE);
        elements.shift();

        if      (VERTEX_RE.test(line))   verts.push.apply(verts, elements);
        else if (NORMAL_RE.test(line))   vertNormals.push.apply(vertNormals, elements);
        else if (TEXTURE_RE.test(line))  textures.push.apply(textures, elements);
        else if (FACE_RE.test(line)) {
          var quad = false;
          for (var j = 0, eleLen = elements.length; j < eleLen; j++)
          {
              if(j === 3 && !quad) {  j = 2;  quad = true;  }
              if(elements[j] in unpacked.hashindices) 
                  unpacked.indices.push(unpacked.hashindices[elements[j]]);
              else
              {
                  var vertex = elements[ j ].split( '/' );

                  unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);   unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);   
                  unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);
                  
                  if (textures.length) 
                    {   unpacked.textures.push(+textures[( (vertex[1] - 1)||vertex[0]) * 2 + 0]);
                        unpacked.textures.push(+textures[( (vertex[1] - 1)||vertex[0]) * 2 + 1]);  }
                  
                  unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 0]);
                  unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 1]);
                  unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 2]);
                  
                  unpacked.hashindices[elements[j]] = unpacked.index;
                  unpacked.indices.push(unpacked.index);
                  unpacked.index += 1;
              }
              if(j === 3 && quad)   unpacked.indices.push( unpacked.hashindices[elements[0]]);
          }
        }
      }
      for( var j = 0; j < unpacked.verts.length/3; j++ )
      {
        this.positions     .push( Vec.of( unpacked.verts[ 3*j ], unpacked.verts[ 3*j + 1 ], unpacked.verts[ 3*j + 2 ] ) );        
        this.normals       .push( Vec.of( unpacked.norms[ 3*j ], unpacked.norms[ 3*j + 1 ], unpacked.norms[ 3*j + 2 ] ) );
        this.texture_coords.push( Vec.of( unpacked.textures[ 2*j ], unpacked.textures[ 2*j + 1 ]  ));
      }
      this.indices = unpacked.indices;

      this.normalize_positions( false );
      this.copy_onto_graphics_card( this.gl );
      this.ready = true;
    }
  draw( graphics_state, model_transform, material )       // Cancel all attempts to draw the shape before it loads.
    { if( this.ready ) super.draw( graphics_state, model_transform, material );   }
}

// Body class to help with inertia and collisions 
window.Body = window.classes.Body = 
class Body          // Store and update the properties of a 3D body that increntally moves from its previous place due to velocities.
{ constructor(               shape, material, size )
    { Object.assign( this, { shape, material, size } ) }
  emplace( location_matrix, linear_velocity, angular_velocity, spin_axis = Vec.of(0,0,0).randomized(1).normalized() )
    { this.center   = location_matrix.times( Vec.of( 0,0,0,1 ) ).to3();
      this.rotation = Mat4.translation( this.center.times( -1 ) ).times( location_matrix );
      this.previous = { center: this.center.copy(), rotation: this.rotation.copy() };
      this.drawn_location = location_matrix;                                      // This gets replaced with an interpolated quantity.
      return Object.assign( this, { linear_velocity, angular_velocity, spin_axis } )
    }
  advance( time_amount )   // Perform forward Euler to advance the linear and angular velocities one time-step.
    { this.previous = { center: this.center.copy(), rotation: this.rotation.copy() };
                                                              // Apply the velocities scaled proportionally to real time (time_amount).
      this.center = this.center.plus( this.linear_velocity.times( time_amount ) );                        // Apply linear velocity.
      this.rotation.pre_multiply( Mat4.rotation( time_amount * this.angular_velocity, this.spin_axis ) ); // Apply angular velocity.
    }
  blend_rotation( alpha )         // We're naively just doing a linear blend of the rotations.  This looks
    {                             // ok sometimes but otherwise produces shear matrices, a wrong result.

                                  // TODO:  Replace this function with proper quaternion blending, and perhaps 
                                  // store this.rotation in quaternion form instead for compactness.
       return this.rotation.map( (x,i) => Vec.from( this.previous.rotation[i] ).mix( x, alpha ) );
    }
  blend_state( alpha )            // Compute the final matrix we'll draw using the previous two physical locations
                                  // the object occupied.  We'll interpolate between these two states as described
                                  // at the end of the "Fix Your Timestep!" article by Glenn Fiedler.
    { this.drawn_location = Mat4.translation( this.previous.center.mix( this.center, alpha ) )
                                      .times( this.blend_rotation( alpha ) )
                                      .times( Mat4.scale( this.size ) );
    }
  check_if_colliding( b, a_inv, shape )   // Collision detection function.
                                          // DISCLAIMER:  The collision method shown below is not used by anyone; it's just very quick 
                                          // to code.  Making every collision body an ellipsoid is kind of a hack, and looping 
                                          // through a list of discrete sphere points to see if the ellipsoids intersect is *really* a 
                                          // hack (there are perfectly good analytic expressions that can test if two ellipsoids 
                                          // intersect without discretizing them into points).
    { if ( this == b ) return false;      // Nothing collides with itself.
      var T = a_inv.times( b.drawn_location );                      // Convert sphere b to the frame where a is a unit sphere.
      for( let p of shape.positions )                               // For each vertex in that b,
        { var Tp = T.times( p.to4(1) ).to3();                       // Shift to the coordinate frame of a_inv*b
          if( Tp.dot( Tp ) < 1.1 )                                  // Check if in that coordinate frame it penetrates the unit sphere
            return true;                                            // at the origin.  Leave .1 of leeway.     
        }
      return false;
    }
}


// Simulation class to help with scene
class Simulation extends Scene_Component                // Simulation manages the stepping of simulation time.  Subclass it when making
{ constructor( context, control_box )                   // a Scene that is a physics demo.  This technique is careful to totally
    { super(   context, control_box );                  // decouple the simulation from the frame rate.
      Object.assign( this, { time_accumulator: 0, time_scale: 1, t: 0, dt: 1/20, bodies: [], steps_taken: 0 } );            
    }
  simulate( frame_time )                              // Carefully advance time according to Glenn Fiedler's "Fix Your Timestep" blog post.
    { frame_time = this.time_scale * frame_time;                   // This line lets us create the illusion to the simulator that 
                                                                   // the display framerate is running fast or slow.
                                                                   // Avoid the spiral of death; limit the amount of time we will spend 
      this.time_accumulator += Math.min( frame_time, 0.1 );	       // computing during this timestep if display lags.
      while ( Math.abs( this.time_accumulator ) >= this.dt )       // Repeatedly step the simulation until we're caught up with this frame.
      { this.update_state( this.dt );                              // Single step of the simulation for all bodies.
        for( let b of this.bodies ) b.advance( this.dt );
          
        this.t                += Math.sign( frame_time ) * this.dt;   // Following the advice of the article, de-couple
        this.time_accumulator -= Math.sign( frame_time ) * this.dt;   // our simulation time from our frame rate.
        this.steps_taken++;
      }
      let alpha = this.time_accumulator / this.dt;                 // Store an interpolation factor for how close our frame fell in between
      for( let b of this.bodies ) b.blend_state( alpha );          // the two latest simulation time steps, so we can correctly blend the
    }                                                              // two latest states and display the result.
  make_control_panel()
    { this.key_triggered_button( "Speed up time", [ "Shift","T" ], function() { this.time_scale *= 5 } );
      this.key_triggered_button( "Slow down time",        [ "t" ], function() { this.time_scale /= 5 } );        this.new_line();
      this.live_string( box => { box.textContent = "Time scale: "  + this.time_scale                              } ); this.new_line();
      this.live_string( box => { box.textContent = "Fixed simulation time step size: "  + this.dt                 } ); this.new_line();
      this.live_string( box => { box.textContent = this.steps_taken + " timesteps were taken so far."             } );
    }
  display( graphics_state )
    { if( !graphics_state.lights.length ) graphics_state.lights = [ new Light( Vec.of( 7,15,20,0 ), Color.of( 1,1,1,1 ), 100000 ) ];

      if( this.globals.animate ) 
        this.simulate( graphics_state.animation_delta_time );                 // Advance the time and state of our whole simulation.
      for( let b of this.bodies ) 
        b.shape.draw( graphics_state, b.drawn_location, b.material );   // Draw each shape at its current location.
    }
  update_state( dt ) { throw "Override this" }          // Your subclass of Simulation has to override this abstract function.
}



// These add movement controls
window.Movement_Controls = window.classes.Movement_Controls =
class Movement_Controls extends Scene_Component    // Movement_Controls is a Scene_Component that can be attached to a canvas, like any 
{                                                  // other Scene, but it is a Secondary Scene Component -- meant to stack alongside other
                                                   // scenes.  Rather than drawing anything it embeds both first-person and third-person
                                                   // style controls into the website.  These can be uesd to manually move your camera or
                                                   // other objects smoothly through your scene using key, mouse, and HTML button controls
                                                   // to help you explore what's in it.
  constructor( context, control_box, canvas = context.canvas )
    { super( context, control_box );
      const globals = this.globals;

      context.globals.has_controls = true;

      context.globals.up = true;


      
 
    }
}



/*
=======================================================================================================================================
   BELOW IS THE dependencies.js from Assignment 3. I am leaving it here just in case we want to use any of it. We can clean it up later
=======================================================================================================================================
*/


window.Triangle = window.classes.Triangle =
class Triangle extends Shape    // The simplest possible Shape – one triangle.  It has 3 vertices, each
{ constructor()                 // having their own 3D position, normal vector, and texture-space coordinate.
    { super( "positions", "normals", "texture_coords" );                       // Name the values we'll define per each vertex.
                                  // First, specify the vertex positions -- the three point locations of an imaginary triangle.
                                  // Next, supply vectors that point away from the triangle face.  They should match up with the points in 
                                  // the above list.  Normal vectors are needed so the graphics engine can know if the shape is pointed at 
                                  // light or not, and color it accordingly.  lastly, put each point somewhere in texture space too.
      this.positions      = [ Vec.of(0,0,0), Vec.of(1,0,0), Vec.of(0,1,0) ];
      this.normals        = [ Vec.of(0,0,1), Vec.of(0,0,1), Vec.of(0,0,1) ];
      this.texture_coords = [ Vec.of(0,0),   Vec.of(1,0),   Vec.of(0,1)   ]; 
      this.indices        = [ 0, 1, 2 ];                         // Index into our vertices to connect them into a whole triangle.
                 // A position, normal, and texture coord fully describes one "vertex".  What's the "i"th vertex?  Simply the combined data 
                 // you get if you look up index "i" of those lists above -- a position, normal vector, and tex coord together.  Lastly we
                 // told it how to connect vertex entries into triangles.  Every three indices in "this.indices" traces out one triangle.
    }
}


window.Square = window.classes.Square =
class Square extends Shape              // A square, demonstrating two triangles that share vertices.  On any planar surface, the interior 
                                        // edges don't make any important seams.  In these cases there's no reason not to re-use data of
{                                       // the common vertices between triangles.  This makes all the vertex arrays (position, normals, 
  constructor()                         // etc) smaller and more cache friendly.
    { super( "positions", "normals", "texture_coords" );                                   // Name the values we'll define per each vertex.
      this.positions     .push( ...Vec.cast( [-1,-1,0], [1,-1,0], [-1,1,0], [1,1,0] ) );   // Specify the 4 square corner locations.
      this.normals       .push( ...Vec.cast( [0,0,1],   [0,0,1],  [0,0,1],  [0,0,1] ) );   // Match those up with normal vectors.
      this.texture_coords.push( ...Vec.cast( [0,0],     [1,0],    [0,1],    [1,1]   ) );   // Draw a square in texture coordinates too.
      this.indices       .push( 0, 1, 2,     1, 3, 2 );                   // Two triangles this time, indexing into four distinct vertices.
    }
}


window.Tetrahedron = window.classes.Tetrahedron =
class Tetrahedron extends Shape                       // The Tetrahedron shape demonstrates flat vs smooth shading (a boolean argument 
{ constructor( using_flat_shading )                   // selects which one).  It is also our first 3D, non-planar shape.
    { super( "positions", "normals", "texture_coords" );
      var a = 1/Math.sqrt(3);
      if( !using_flat_shading )                                 // Method 1:  A tetrahedron with shared vertices.  Compact, performs better,
      {                                                         // but can't produce flat shading or discontinuous seams in textures.
          this.positions     .push( ...Vec.cast( [ 0, 0, 0], [1,0,0], [0,1,0], [0,0,1] ) );          
          this.normals       .push( ...Vec.cast( [-a,-a,-a], [1,0,0], [0,1,0], [0,0,1] ) );          
          this.texture_coords.push( ...Vec.cast( [ 0, 0   ], [1,0  ], [0,1, ], [1,1  ] ) );
          this.indices       .push( 0, 1, 2,   0, 1, 3,   0, 2, 3,    1, 2, 3 );  // Vertices are shared multiple times with this method.
      }
      else
      { this.positions     .push( ...Vec.cast( [0,0,0], [1,0,0], [0,1,0],         // Method 2:  A tetrahedron with 
                                               [0,0,0], [1,0,0], [0,0,1],         // four independent triangles.
                                               [0,0,0], [0,1,0], [0,0,1],
                                               [0,0,1], [1,0,0], [0,1,0] ) );

        this.normals       .push( ...Vec.cast( [0,0,-1], [0,0,-1], [0,0,-1],        // This here makes Method 2 flat shaded, since values
                                               [0,-1,0], [0,-1,0], [0,-1,0],        // of normal vectors can be constant per whole
                                               [-1,0,0], [-1,0,0], [-1,0,0],        // triangle.  Repeat them for all three vertices.
                                               [ a,a,a], [ a,a,a], [ a,a,a] ) );

        this.texture_coords.push( ...Vec.cast( [0,0], [1,0], [1,1],      // Each face in Method 2 also gets its own set of texture coords
                                               [0,0], [1,0], [1,1],      //(half the image is mapped onto each face).  We couldn't do this
                                               [0,0], [1,0], [1,1],      // with shared vertices since this features abrupt transitions
                                               [0,0], [1,0], [1,1] ) );  // when approaching the same point from different directions.

        this.indices.push( 0, 1, 2,    3, 4, 5,    6, 7, 8,    9, 10, 11 );      // Notice all vertices are unique this time.
      }
    }
}


window.Windmill = window.classes.Windmill =
class Windmill extends Shape                     // Windmill Shape.  As our shapes get more complicated, we begin using matrices and flow
{ constructor( num_blades )                      // control (including loops) to generate non-trivial point clouds and connect them.
    { super( "positions", "normals", "texture_coords" );
      for( var i = 0; i < num_blades; i++ )     // A loop to automatically generate the triangles.
        {                                                                                   // Rotate around a few degrees in the
          var spin = Mat4.rotation( i * 2*Math.PI/num_blades, Vec.of( 0,1,0 ) );            // XZ plane to place each new point.
          var newPoint  = spin.times( Vec.of( 1,0,0,1 ) ).to3();   // Apply that XZ rotation matrix to point (1,0,0) of the base triangle.
          this.positions.push( newPoint,                           // Store this XZ position.                  This is point 1.
                               newPoint.plus( [ 0,1,0 ] ),         // Store it again but with higher y coord:  This is point 2.
                                        Vec.of( 0,0,0 )    );      // All triangles touch this location.       This is point 3.

                        // Rotate our base triangle's normal (0,0,1) to get the new one.  Careful!  Normal vectors are not points; 
                        // their perpendicularity constraint gives them a mathematical quirk that when applying matrices you have
                        // to apply the transposed inverse of that matrix instead.  But right now we've got a pure rotation matrix, 
                        // where the inverse and transpose operations cancel out.
          var newNormal = spin.times( Vec.of( 0,0,1 ).to4(0) ).to3();  
          this.normals       .push( newNormal, newNormal, newNormal          );
          this.texture_coords.push( ...Vec.cast( [ 0,0 ], [ 0,1 ], [ 1,0 ] ) );
          this.indices       .push( 3*i, 3*i + 1, 3*i + 2                    ); // Procedurally connect the 3 new vertices into triangles.
        }
    }
}

window.Cube = window.classes.Cube =
class Cube extends Shape    // A cube inserts six square strips into its arrays.
{ constructor()  
    { super( "positions", "normals", "texture_coords" );
      for( var i = 0; i < 3; i++ )                    
        for( var j = 0; j < 2; j++ )
        { var square_transform = Mat4.rotation( i == 0 ? Math.PI/2 : 0, Vec.of(1, 0, 0) )
                         .times( Mat4.rotation( Math.PI * j - ( i == 1 ? Math.PI/2 : 0 ), Vec.of( 0, 1, 0 ) ) )
                         .times( Mat4.translation([ 0, 0, 1 ]) );
          Square.insert_transformed_copy_into( this, [], square_transform );
        }
    }
}

window.Line_Segment_Array = window.classes.Line_Segment_Array =
class Line_Segment_Array extends Shape    // Plot 2D points.
{ constructor()
  { super( "positions", "colors" );
    this.indexed = false;
  }
  set_data( origins, destinations, colors, gl = this.gl )      // Provide two lists of points (each pair will be connected into a segment),
    { this.positions = [];                                     // plus a list of enough colors for each of those two points per segment.
      for( let [i] of origins.entries() )
      { this.positions[ 2*i     ] = origins[i];  
        this.positions[ 2*i + 1 ] = destinations[i];
      }
      this.colors = colors;
      this.copy_onto_graphics_card( gl, [ "positions", "colors" ], false );
    }
  execute_shaders( gl ) { gl.drawArrays( gl.LINES, 0, this.positions.length ) }   // Same as normal draw, but with gl.LINES.
}


window.Subdivision_Sphere = window.classes.Subdivision_Sphere =
class Subdivision_Sphere extends Shape  // This Shape defines a Sphere surface, with nice uniform triangles.  A subdivision surface (see
{                                       // Wikipedia article on those) is initially simple, then builds itself into a more and more 
                                        // detailed shape of the same layout.  Each act of subdivision makes it a better approximation of 
                                        // some desired mathematical surface by projecting each new point onto that surface's known 
                                        // implicit equation.  For a sphere, we begin with a closed 3-simplex (a tetrahedron).  For each
                                        // face, connect the midpoints of each edge together to make more faces.  Repeat recursively until 
                                        // the desired level of detail is obtained.  Project all new vertices to unit vectors (onto the                                         
  constructor( max_subdivisions )       // unit sphere) and group them into triangles by following the predictable pattern of the recursion.
    { super( "positions", "normals", "texture_coords" );                      // Start from the following equilateral tetrahedron:
      this.positions.push( ...Vec.cast( [ 0, 0, -1 ], [ 0, .9428, .3333 ], [ -.8165, -.4714, .3333 ], [ .8165, -.4714, .3333 ] ) );
      
      this.subdivideTriangle( 0, 1, 2, max_subdivisions);  // Begin recursion.
      this.subdivideTriangle( 3, 2, 1, max_subdivisions);
      this.subdivideTriangle( 1, 0, 3, max_subdivisions);
      this.subdivideTriangle( 0, 2, 3, max_subdivisions); 
      
      for( let p of this.positions )
        { this.normals.push( p.copy() );                 // Each point has a normal vector that simply goes to the point from the origin.

                                                         // Textures are tricky.  A Subdivision sphere has no straight seams to which image 
                                                         // edges in UV space can be mapped.  The only way to avoid artifacts is to smoothly                                                          
          this.texture_coords.push(                      // wrap & unwrap the image in reverse - displaying the texture twice on the sphere.
                                 Vec.of( Math.asin( p[0]/Math.PI ) + .5, Math.asin( p[1]/Math.PI ) + .5 ) ) }
    }
  subdivideTriangle( a, b, c, count )   // Recurse through each level of detail by splitting triangle (a,b,c) into four smaller ones.
    { 
      if( count <= 0) { this.indices.push(a,b,c); return; }  // Base case of recursion - we've hit the finest level of detail we want.
                  
      var ab_vert = this.positions[a].mix( this.positions[b], 0.5).normalized(),     // We're not at the base case.  So, build 3 new
          ac_vert = this.positions[a].mix( this.positions[c], 0.5).normalized(),     // vertices at midpoints, and extrude them out to
          bc_vert = this.positions[b].mix( this.positions[c], 0.5).normalized();     // touch the unit sphere (length 1).
            
      var ab = this.positions.push( ab_vert ) - 1,      // Here, push() returns the indices of the three new vertices (plus one).
          ac = this.positions.push( ac_vert ) - 1,  
          bc = this.positions.push( bc_vert ) - 1;  
      
      this.subdivideTriangle( a, ab, ac,  count - 1 );          // Recurse on four smaller triangles, and we're done.  Skipping every
      this.subdivideTriangle( ab, b, bc,  count - 1 );          // fourth vertex index in our list takes you down one level of detail,
      this.subdivideTriangle( ac, bc, c,  count - 1 );          // and so on, due to the way we're building it.
      this.subdivideTriangle( ab, bc, ac, count - 1 );
    }
}


window.Grid_Patch = window.classes.Grid_Patch =
class Grid_Patch extends Shape              // A grid of rows and columns you can distort. A tesselation of triangles connects the
{                                           // points, generated with a certain predictable pattern of indices.  Two callbacks
                                            // allow you to dynamically define how to reach the next row or column.
  constructor( rows, columns, next_row_function, next_column_function, texture_coord_range = [ [ 0, rows ], [ 0, columns ] ]  )
    { super( "positions", "normals", "texture_coords" );
      let points = [];
      for( let r = 0; r <= rows; r++ ) 
      { points.push( new Array( columns+1 ) );                                                    // Allocate a 2D array.
                                             // Use next_row_function to generate the start point of each row. Pass in the progress ratio,
        points[ r ][ 0 ] = next_row_function( r/rows, points[ r-1 ] && points[ r-1 ][ 0 ] );      // and the previous point if it existed.                                                                                                  
      }
      for(   let r = 0; r <= rows;    r++ )               // From those, use next_column function to generate the remaining points:
        for( let c = 0; c <= columns; c++ )
        { if( c > 0 ) points[r][ c ] = next_column_function( c/columns, points[r][ c-1 ], r/rows );
      
          this.positions.push( points[r][ c ] );        
                                                                                      // Interpolate texture coords from a provided range.
          const a1 = c/columns, a2 = r/rows, x_range = texture_coord_range[0], y_range = texture_coord_range[1];
          this.texture_coords.push( Vec.of( ( a1 )*x_range[1] + ( 1-a1 )*x_range[0], ( a2 )*y_range[1] + ( 1-a2 )*y_range[0] ) );
        }
      for(   let r = 0; r <= rows;    r++ )            // Generate normals by averaging the cross products of all defined neighbor pairs.
        for( let c = 0; c <= columns; c++ )
        { let curr = points[r][c], neighbors = new Array(4), normal = Vec.of( 0,0,0 );          
          for( let [ i, dir ] of [ [ -1,0 ], [ 0,1 ], [ 1,0 ], [ 0,-1 ] ].entries() )         // Store each neighbor by rotational order.
            neighbors[i] = points[ r + dir[1] ] && points[ r + dir[1] ][ c + dir[0] ];        // Leave "undefined" in the array wherever
                                                                                              // we hit a boundary.
          for( let i = 0; i < 4; i++ )                                          // Take cross-products of pairs of neighbors, proceeding
            if( neighbors[i] && neighbors[ (i+1)%4 ] )                          // a consistent rotational direction through the pairs:
              normal = normal.plus( neighbors[i].minus( curr ).cross( neighbors[ (i+1)%4 ].minus( curr ) ) );          
          normal.normalize();                                                              // Normalize the sum to get the average vector.
                                                     // Store the normal if it's valid (not NaN or zero length), otherwise use a default:
          if( normal.every( x => x == x ) && normal.norm() > .01 )  this.normals.push( Vec.from( normal ) );    
          else                                                      this.normals.push( Vec.of( 0,0,1 )    );
        }   
        
      for( var h = 0; h < rows; h++ )             // Generate a sequence like this (if #columns is 10):  
        for( var i = 0; i < 2 * columns; i++ )    // "1 11 0  11 1 12  2 12 1  12 2 13  3 13 2  13 3 14  4 14 3..." 
          for( var j = 0; j < 3; j++ )
            this.indices.push( h * ( columns + 1 ) + columns * ( ( i + ( j % 2 ) ) % 2 ) + ( ~~( ( j % 3 ) / 2 ) ? 
                                   ( ~~( i / 2 ) + 2 * ( i % 2 ) )  :  ( ~~( i / 2 ) + 1 ) ) );
    }
  static sample_array( array, ratio )                 // Optional but sometimes useful as a next row or column operation. In a given array
    {                                                 // of points, intepolate the pair of points that our progress ratio falls between.  
      const frac = ratio * ( array.length - 1 ), alpha = frac - Math.floor( frac );
      return array[ Math.floor( frac ) ].mix( array[ Math.ceil( frac ) ], alpha );
    }
}

window.Surface_Of_Revolution = window.classes.Surface_Of_Revolution =
class Surface_Of_Revolution extends Grid_Patch      // SURFACE OF REVOLUTION: Produce a curved "sheet" of triangles with rows and columns.
                                                    // Begin with an input array of points, defining a 1D path curving through 3D space -- 
                                                    // now let each such point be a row.  Sweep that whole curve around the Z axis in equal 
                                                    // steps, stopping and storing new points along the way; let each step be a column. Now
                                                    // we have a flexible "generalized cylinder" spanning an area until total_curvature_angle.
{ constructor( rows, columns, points, texture_coord_range, total_curvature_angle = 2*Math.PI )
    { const row_operation =     i => Grid_Patch.sample_array( points, i ),
         column_operation = (j,p) => Mat4.rotation( total_curvature_angle/columns, Vec.of( 0,0,1 ) ).times(p.to4(1)).to3();
         
       super( rows, columns, row_operation, column_operation, texture_coord_range );
    }
}

window.Regular_2D_Polygon = window.classes.Regular_2D_Polygon =
class Regular_2D_Polygon extends Surface_Of_Revolution  // Approximates a flat disk / circle
  { constructor( rows, columns ) { super( rows, columns, Vec.cast( [0, 0, 0], [1, 0, 0] ) ); 
                                   this.normals = this.normals.map( x => Vec.of( 0,0,1 ) );
                                   this.texture_coords.forEach( (x, i, a) => a[i] = this.positions[i].map( x => x/2 + .5 ).slice(0,2) ); } }

window.Cylindrical_Tube = window.classes.Cylindrical_Tube =
class Cylindrical_Tube extends Surface_Of_Revolution    // An open tube shape with equally sized sections, pointing down Z locally.    
  { constructor( rows, columns, texture_range ) { super( rows, columns, Vec.cast( [1, 0, .5], [1, 0, -.5] ), texture_range ); } }

window.Cone_Tip = window.classes.Cone_Tip =
class Cone_Tip extends Surface_Of_Revolution        // Note:  Touches the Z axis; squares degenerate into triangles as they sweep around.
  { constructor( rows, columns, texture_range ) { super( rows, columns, Vec.cast( [0, 0, 1],  [1, 0, -1]  ), texture_range ); } }

window.Torus = window.classes.Torus =
class Torus extends Shape                                         // Build a donut shape.  An example of a surface of revolution.
  { constructor( rows, columns )  
      { super( "positions", "normals", "texture_coords" );
        const circle_points = Array( rows ).fill( Vec.of( .75,0,0 ) )
                                           .map( (p,i,a) => Mat4.translation([ -2,0,0 ])
                                                    .times( Mat4.rotation( i/(a.length-1) * 2*Math.PI, Vec.of( 0,-1,0 ) ) )
                                                    .times( p.to4(1) ).to3() );

        Surface_Of_Revolution.insert_transformed_copy_into( this, [ rows, columns, circle_points ] );         
      } }

window.Grid_Sphere = window.classes.Grid_Sphere =
class Grid_Sphere extends Shape           // With lattitude / longitude divisions; this means singularities are at 
  { constructor( rows, columns, texture_range )             // the mesh's top and bottom.  Subdivision_Sphere is a better alternative.
      { super( "positions", "normals", "texture_coords" );
        const circle_points = Array( rows ).fill( Vec.of( .75,0,0 ) )
                                           .map( (p,i,a) =>Mat4.rotation( i/(a.length-1) *  Math.PI, Vec.of( 0,-1,0 ) )
                                                    .times( p.to4(1) ).to3() );

        Surface_Of_Revolution.insert_transformed_copy_into( this, [ rows, columns, circle_points ] );  
      } }

window.Closed_Cone = window.classes.Closed_Cone =
class Closed_Cone extends Shape     // Combine a cone tip and a regular polygon to make a closed cone.
  { constructor( rows, columns, texture_range )
      { super( "positions", "normals", "texture_coords" );
        Cone_Tip          .insert_transformed_copy_into( this, [ rows, columns, texture_range ]);    
        Regular_2D_Polygon.insert_transformed_copy_into( this, [ 1, columns ], Mat4.rotation( Math.PI, Vec.of(0, 1, 0) )
                                                                       .times( Mat4.translation([ 0, 0, 1 ]) ) ); } }

window.Rounded_Closed_Cone = window.classes.Rounded_Closed_Cone =
class Rounded_Closed_Cone extends Surface_Of_Revolution   // An alternative without two separate sections
  { constructor( rows, columns, texture_range ) { super( rows, columns, Vec.cast( [0, 0, 1], [1, 0, -1], [0, 0, -1] ), texture_range ) ; } }

window.Capped_Cylinder = window.classes.Capped_Cylinder =
class Capped_Cylinder extends Shape                       // Combine a tube and two regular polygons to make a closed cylinder.
  { constructor( rows, columns, texture_range )           // Flat shade this to make a prism, where #columns = #sides.
      { super( "positions", "normals", "texture_coords" );
        Cylindrical_Tube  .insert_transformed_copy_into( this, [ rows, columns, texture_range ] );
        Regular_2D_Polygon.insert_transformed_copy_into( this, [ 1, columns ],                                                  Mat4.translation([ 0, 0, .5 ]) );
        Regular_2D_Polygon.insert_transformed_copy_into( this, [ 1, columns ], Mat4.rotation( Math.PI, Vec.of(0, 1, 0) ).times( Mat4.translation([ 0, 0, .5 ]) ) ); } }

window.Rounded_Capped_Cylinder = window.classes.Rounded_Capped_Cylinder =
class Rounded_Capped_Cylinder extends Surface_Of_Revolution   // An alternative without three separate sections
  { constructor ( rows, columns, texture_range ) { super( rows, columns, Vec.cast( [0, 0, .5], [1, 0, .5], [1, 0, -.5], [0, 0, -.5] ), texture_range ); } }
  
  
window.Axis_Arrows = window.classes.Axis_Arrows =
class Axis_Arrows extends Shape                                   // An axis set with arrows, made out of a lot of various primitives.
{ constructor()
    { super( "positions", "normals", "texture_coords" );
      var stack = [];       
      Subdivision_Sphere.insert_transformed_copy_into( this, [ 3 ], Mat4.rotation( Math.PI/2, Vec.of( 0,1,0 ) ).times( Mat4.scale([ .25, .25, .25 ]) ) );
      this.drawOneAxis( Mat4.identity(),                                                            [[ .67, 1  ], [ 0,1 ]] );
      this.drawOneAxis( Mat4.rotation(-Math.PI/2, Vec.of(1,0,0)).times( Mat4.scale([  1, -1, 1 ])), [[ .34,.66 ], [ 0,1 ]] );
      this.drawOneAxis( Mat4.rotation( Math.PI/2, Vec.of(0,1,0)).times( Mat4.scale([ -1,  1, 1 ])), [[  0 ,.33 ], [ 0,1 ]] ); 
    }
  drawOneAxis( transform, tex )    // Use a different texture coordinate range for each of the three axes, so they show up differently.
    { Closed_Cone     .insert_transformed_copy_into( this, [ 4, 10, tex ], transform.times( Mat4.translation([   0,   0,  2 ]) ).times( Mat4.scale([ .25, .25, .25 ]) ) );
      Cube            .insert_transformed_copy_into( this, [ ],            transform.times( Mat4.translation([ .95, .95, .45]) ).times( Mat4.scale([ .05, .05, .45 ]) ) );
      Cube            .insert_transformed_copy_into( this, [ ],            transform.times( Mat4.translation([ .95,   0, .5 ]) ).times( Mat4.scale([ .05, .05, .4  ]) ) );
      Cube            .insert_transformed_copy_into( this, [ ],            transform.times( Mat4.translation([   0, .95, .5 ]) ).times( Mat4.scale([ .05, .05, .4  ]) ) );
      Cylindrical_Tube.insert_transformed_copy_into( this, [ 7, 7,  tex ], transform.times( Mat4.translation([   0,   0,  1 ]) ).times( Mat4.scale([  .1,  .1,  2  ]) ) );
    }
}


window.Basic_Shader = window.classes.Basic_Shader =
class Basic_Shader extends Shader             // Subclasses of Shader each store and manage a complete GPU program.  This Shader is 
{                                             // the simplest example of one.  It samples pixels from colors that are directly assigned 
  material() { return { shader: this } }      // to the vertices.  Materials here are minimal, without any settings.
  map_attribute_name_to_buffer_name( name )        // The shader will pull single entries out of the vertex arrays, by their data fields'
    {                                              // names.  Map those names onto the arrays we'll pull them from.  This determines
                                                   // which kinds of Shapes this Shader is compatible with.  Thanks to this function, 
                                                   // Vertex buffers in the GPU can get their pointers matched up with pointers to 
                                                   // attribute names in the GPU.  Shapes and Shaders can still be compatible even
                                                   // if some vertex data feilds are unused. 
      return { object_space_pos: "positions", color: "colors" }[ name ];      // Use a simple lookup table.
    }
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl )
      { const [ P, C, M ] = [ g_state.projection_transform, g_state.camera_transform, model_transform ],
                      PCM = P.times( C ).times( M );
        gl.uniformMatrix4fv( gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
      }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
              varying vec4 VERTEX_COLOR;
      `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec4 color;
        attribute vec3 object_space_pos;
        uniform mat4 projection_camera_model_transform;

        void main()
        { gl_Position = projection_camera_model_transform * vec4(object_space_pos, 1.0);      // The vertex's final resting place (in NDCS).
          VERTEX_COLOR = color;                                                               // Use the hard-coded color of the vertex.
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    { return `
        void main()
        { gl_FragColor = VERTEX_COLOR;                                    // The interpolation gets done directly on the per-vertex colors.
        }`;
    }
}


window.Funny_Shader = window.classes.Funny_Shader =
class Funny_Shader extends Shader         // Simple "procedural" texture shader, with texture coordinates but without an input image.
{ material() { return { shader: this } }  // Materials here are minimal, without any settings.
  map_attribute_name_to_buffer_name( name )                  // We'll pull single entries out per vertex by field name.  Map
    {                                                        // those names onto the vertex array names we'll pull them from.
      return { object_space_pos: "positions", tex_coord: "texture_coords" }[ name ]; }      // Use a simple lookup table.
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl )
      { const [ P, C, M ] = [ g_state.projection_transform, g_state.camera_transform, model_transform ],
                      PCM = P.times( C ).times( M );
        gl.uniformMatrix4fv( gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
        gl.uniform1f ( gpu.animation_time_loc, g_state.animation_time / 1000 );
      }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
              varying vec2 f_tex_coord;
      `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec3 object_space_pos;
        attribute vec2 tex_coord;
        uniform mat4 projection_camera_model_transform;

        void main()
        { gl_Position = projection_camera_model_transform * vec4(object_space_pos, 1.0);   // The vertex's final resting place (in NDCS).
          f_tex_coord = tex_coord;                                       // Directly use original texture coords and interpolate between.
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    { return `
        uniform float animation_time;
        void main()
        { float a = animation_time, u = f_tex_coord.x, v = f_tex_coord.y;   
                                                                  // Use an arbitrary math function to color in all pixels as a complex                                                                  
          gl_FragColor = vec4(                                    // function of the UV texture coordintaes of the pixel and of time.  
            2.0 * u * sin(17.0 * u ) + 3.0 * v * sin(11.0 * v ) + 1.0 * sin(13.0 * a),
            3.0 * u * sin(18.0 * u ) + 4.0 * v * sin(12.0 * v ) + 2.0 * sin(14.0 * a),
            4.0 * u * sin(19.0 * u ) + 5.0 * v * sin(13.0 * v ) + 3.0 * sin(15.0 * a),
            5.0 * u * sin(20.0 * u ) + 6.0 * v * sin(14.0 * v ) + 4.0 * sin(16.0 * a));
        }`;
    }
}


window.Phong_Shader = window.classes.Phong_Shader =
class Phong_Shader extends Shader          // THE DEFAULT SHADER: This uses the Phong Reflection Model, with optional Gouraud shading. 
                                           // Wikipedia has good defintions for these concepts.  Subclasses of class Shader each store 
                                           // and manage a complete GPU program.  This particular one is a big "master shader" meant to 
                                           // handle all sorts of lighting situations in a configurable way. 
                                           // Phong Shading is the act of determining brightness of pixels via vector math.  It compares
                                           // the normal vector at that pixel to the vectors toward the camera and light sources.
          // *** How Shaders Work:
                                           // The "vertex_glsl_code" string below is code that is sent to the graphics card at runtime, 
                                           // where on each run it gets compiled and linked there.  Thereafter, all of your calls to draw 
                                           // shapes will launch the vertex shader program once per vertex in the shape (three times per 
                                           // triangle), sending results on to the next phase.  The purpose of this vertex shader program 
                                           // is to calculate the final resting place of vertices in screen coordinates; each vertex 
                                           // starts out in local object coordinates and then undergoes a matrix transform to get there.
                                           //
                                           // Likewise, the "fragment_glsl_code" string is used as the Fragment Shader program, which gets 
                                           // sent to the graphics card at runtime.  The fragment shader runs once all the vertices in a 
                                           // triangle / element finish their vertex shader programs, and thus have finished finding out 
                                           // where they land on the screen.  The fragment shader fills in (shades) every pixel (fragment) 
                                           // overlapping where the triangle landed.  It retrieves different values (such as vectors) that 
                                           // are stored at three extreme points of the triangle, and then interpolates the values weighted 
                                           // by the pixel's proximity to each extreme point, using them in formulas to determine color.
                                           // The fragment colors may or may not become final pixel colors; there could already be other 
                                           // triangles' fragments occupying the same pixels.  The Z-Buffer test is applied to see if the 
                                           // new triangle is closer to the camera, and even if so, blending settings may interpolate some 
                                           // of the old color into the result.  Finally, an image is displayed onscreen.
{ material( color, properties )     // Define an internal class "Material" that stores the standard settings found in Phong lighting.
  { return new class Material       // Possible properties: ambient, diffusivity, specularity, smoothness, gouraud, texture.
      { constructor( shader, color = Color.of( 0,0,0,1 ), ambient = 0, diffusivity = 1, specularity = 1, smoothness = 40 )
          { Object.assign( this, { shader, color, ambient, diffusivity, specularity, smoothness } );  // Assign defaults.
            Object.assign( this, properties );                                                        // Optionally override defaults.
          }
        override( properties )                      // Easily make temporary overridden versions of a base material, such as
          { const copied = new this.constructor();  // of a different color or diffusivity.  Use "opacity" to override only that.
            Object.assign( copied, this );
            Object.assign( copied, properties );
            copied.color = copied.color.copy();
            if( properties[ "opacity" ] != undefined ) copied.color[3] = properties[ "opacity" ];
            return copied;
          }
      }( this, color );
  }
  map_attribute_name_to_buffer_name( name )                  // We'll pull single entries out per vertex by field name.  Map
    {                                                        // those names onto the vertex array names we'll pull them from.
      return { object_space_pos: "positions", normal: "normals", tex_coord: "texture_coords" }[ name ]; }   // Use a simple lookup table.
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
        const int N_LIGHTS = 2;             // We're limited to only so many inputs in hardware.  Lights are costly (lots of sub-values).
        uniform float ambient, diffusivity, specularity, smoothness, animation_time, attenuation_factor[N_LIGHTS];
        uniform bool GOURAUD, COLOR_NORMALS, USE_TEXTURE;               // Flags for alternate shading methods
        uniform vec4 lightPosition[N_LIGHTS], lightColor[N_LIGHTS], shapeColor;
        varying vec3 N, E;                    // Specifier "varying" means a variable's final value will be passed from the vertex shader 
        varying vec2 f_tex_coord;             // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
        varying vec4 VERTEX_COLOR;            // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 L[N_LIGHTS], H[N_LIGHTS];
        varying float dist[N_LIGHTS];
        
        vec3 phong_model_lights( vec3 N )
          { vec3 result = vec3(0.0);
            for(int i = 0; i < N_LIGHTS; i++)
              {
                float attenuation_multiplier = 1.0 / (1.0 + attenuation_factor[i] * (dist[i] * dist[i]));
                float diffuse  =      max( dot(N, L[i]), 0.0 );
                float specular = pow( max( dot(N, H[i]), 0.0 ), smoothness );

                result += attenuation_multiplier * ( shapeColor.xyz * diffusivity * diffuse + lightColor[i].xyz * specularity * specular );
              }
            return result;
          }
        `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec3 object_space_pos, normal;
        attribute vec2 tex_coord;

        uniform mat4 camera_transform, camera_model_transform, projection_camera_model_transform;
        uniform mat3 inverse_transpose_modelview;

        void main()
        { gl_Position = projection_camera_model_transform * vec4(object_space_pos, 1.0);     // The vertex's final resting place (in NDCS).
          N = normalize( inverse_transpose_modelview * normal );                             // The final normal vector in screen space.
          f_tex_coord = tex_coord;                                         // Directly use original texture coords and interpolate between.
          
          if( COLOR_NORMALS )                                     // Bypass all lighting code if we're lighting up vertices some other way.
          { VERTEX_COLOR = vec4( N[0] > 0.0 ? N[0] : sin( animation_time * 3.0   ) * -N[0],             // In "normals" mode, 
                                 N[1] > 0.0 ? N[1] : sin( animation_time * 15.0  ) * -N[1],             // rgb color = xyz quantity.
                                 N[2] > 0.0 ? N[2] : sin( animation_time * 45.0  ) * -N[2] , 1.0 );     // Flash if it's negative.
            return;
          }
                                                  // The rest of this shader calculates some quantities that the Fragment shader will need:
          vec3 screen_space_pos = ( camera_model_transform * vec4(object_space_pos, 1.0) ).xyz;
          E = normalize( -screen_space_pos );

          for( int i = 0; i < N_LIGHTS; i++ )
          {            // Light positions use homogeneous coords.  Use w = 0 for a directional light source -- a vector instead of a point.
            L[i] = normalize( ( camera_transform * lightPosition[i] ).xyz - lightPosition[i].w * screen_space_pos );
            H[i] = normalize( L[i] + E );
            
            // Is it a point light source?  Calculate the distance to it from the object.  Otherwise use some arbitrary distance.
            dist[i]  = lightPosition[i].w > 0.0 ? distance((camera_transform * lightPosition[i]).xyz, screen_space_pos)
                                                : distance( attenuation_factor[i] * -lightPosition[i].xyz, object_space_pos.xyz );
          }

          if( GOURAUD )                   // Gouraud shading mode?  If so, finalize the whole color calculation here in the vertex shader, 
          {                               // one per vertex, before we even break it down to pixels in the fragment shader.   As opposed 
                                          // to Smooth "Phong" Shading, where we *do* wait to calculate final color until the next shader.
            VERTEX_COLOR      = vec4( shapeColor.xyz * ambient, shapeColor.w);
            VERTEX_COLOR.xyz += phong_model_lights( N );
          }
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER ********* 
    {                            // A fragment is a pixel that's overlapped by the current triangle.
                                 // Fragments affect the final image or get discarded due to depth.
      return `
        uniform sampler2D texture;
        void main()
        { if( GOURAUD || COLOR_NORMALS )    // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.
          { gl_FragColor = VERTEX_COLOR;    // Otherwise, we already have final colors to smear (interpolate) across vertices.            
            return;
          }                                 // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                                            // Phong shading is not to be confused with the Phong Reflection Model.
          vec4 tex_color = texture2D( texture, f_tex_coord );                         // Sample the texture image in the correct place.
                                                                                      // Compute an initial (ambient) color:
          if( USE_TEXTURE ) gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
          else gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
          gl_FragColor.xyz += phong_model_lights( N );                     // Compute the final color with contributions from lights.
        }`;
    }
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl )
    {                              // First, send the matrices to the GPU, additionally cache-ing some products of them we know we'll need:
      this.update_matrices( g_state, model_transform, gpu, gl );
      gl.uniform1f ( gpu.animation_time_loc, g_state.animation_time / 1000 );

      if( g_state.gouraud === undefined ) { g_state.gouraud = g_state.color_normals = false; }    // Keep the flags seen by the shader 
      gl.uniform1i( gpu.GOURAUD_loc,        g_state.gouraud || material.gouraud );                // program up-to-date and make sure 
      gl.uniform1i( gpu.COLOR_NORMALS_loc,  g_state.color_normals );                              // they are declared.

      gl.uniform4fv( gpu.shapeColor_loc,     material.color       );    // Send the desired shape-wide material qualities 
      gl.uniform1f ( gpu.ambient_loc,        material.ambient     );    // to the graphics card, where they will tweak the
      gl.uniform1f ( gpu.diffusivity_loc,    material.diffusivity );    // Phong lighting formula.
      gl.uniform1f ( gpu.specularity_loc,    material.specularity );
      gl.uniform1f ( gpu.smoothness_loc,     material.smoothness  );

      if( material.texture )                           // NOTE: To signal not to draw a texture, omit the texture parameter from Materials.
      { gpu.shader_attributes["tex_coord"].enabled = true;
        gl.uniform1f ( gpu.USE_TEXTURE_loc, 1 );
        gl.bindTexture( gl.TEXTURE_2D, material.texture.id );
      }
      else  { gl.uniform1f ( gpu.USE_TEXTURE_loc, 0 );   gpu.shader_attributes["tex_coord"].enabled = false; }

      if( !g_state.lights.length )  return;
      var lightPositions_flattened = [], lightColors_flattened = [], lightAttenuations_flattened = [];
      for( var i = 0; i < 4 * g_state.lights.length; i++ )
        { lightPositions_flattened                  .push( g_state.lights[ Math.floor(i/4) ].position[i%4] );
          lightColors_flattened                     .push( g_state.lights[ Math.floor(i/4) ].color[i%4] );
          lightAttenuations_flattened[ Math.floor(i/4) ] = g_state.lights[ Math.floor(i/4) ].attenuation;
        }
      gl.uniform4fv( gpu.lightPosition_loc,       lightPositions_flattened );
      gl.uniform4fv( gpu.lightColor_loc,          lightColors_flattened );
      gl.uniform1fv( gpu.attenuation_factor_loc,  lightAttenuations_flattened );
    }
  update_matrices( g_state, model_transform, gpu, gl )                                    // Helper function for sending matrices to GPU.
    {                                                   // (PCM will mean Projection * Camera * Model)
      let [ P, C, M ]    = [ g_state.projection_transform, g_state.camera_transform, model_transform ],
            CM     =      C.times(  M ),
            PCM    =      P.times( CM ),
            inv_CM = Mat4.inverse( CM ).sub_block([0,0], [3,3]);
                                                                  // Send the current matrices to the shader.  Go ahead and pre-compute
                                                                  // the products we'll need of the of the three special matrices and just
                                                                  // cache and send those.  They will be the same throughout this draw
                                                                  // call, and thus across each instance of the vertex shader.
                                                                  // Transpose them since the GPU expects matrices as column-major arrays.                                  
      gl.uniformMatrix4fv( gpu.camera_transform_loc,                  false, Mat.flatten_2D_to_1D(     C .transposed() ) );
      gl.uniformMatrix4fv( gpu.camera_model_transform_loc,            false, Mat.flatten_2D_to_1D(     CM.transposed() ) );
      gl.uniformMatrix4fv( gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D(    PCM.transposed() ) );
      gl.uniformMatrix3fv( gpu.inverse_transpose_modelview_loc,       false, Mat.flatten_2D_to_1D( inv_CM              ) );       
    }
}

class Texture_Scroll_XY extends Phong_Shader
{ fragment_glsl_code()           // ********* FRAGMENT SHADER ********* 
    {
      return `
        uniform sampler2D texture;
        void main()
        { if( GOURAUD || COLOR_NORMALS )    // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.
          { gl_FragColor = VERTEX_COLOR;    // Otherwise, we already have final colors to smear (interpolate) across vertices.            
            return;
          }                                 // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                                            // Phong shading is not to be confused with the Phong Reflection Model.
			//Moves the texture left by 2 tex units/second - use animation time and mod to make sure the tex_color.x stays within range, since precision needs to be kept in mind
          vec4 tex_color = texture2D( texture, vec2(f_tex_coord.x+(mod(animation_time, 8.0)*0.1), f_tex_coord.y+(mod(animation_time, 8.0)*0.05)) );                         // Sample the texture image in the correct place.
                                                                                      // Compute an initial (ambient) color:
          if( USE_TEXTURE ) gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
          else gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
          gl_FragColor.xyz += phong_model_lights( N );                     // Compute the final color with contributions from lights.
        }`;
    }
}

// FROM GARRETT
class Fake_Bump_Map extends Phong_Shader                         // Same as Phong_Shader, except this adds one line of code.
{ fragment_glsl_code()           // ********* FRAGMENT SHADER ********* 
    { return `
        uniform sampler2D texture;
        void main()
        { if( GOURAUD || COLOR_NORMALS )    // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.
          { gl_FragColor = VERTEX_COLOR;    // Otherwise, we already have final colors to smear (interpolate) across vertices.            
            return;
          }                                 // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                                            // Phong shading is not to be confused with the Phong Reflection Model.
          
          vec4 tex_color = texture2D( texture, f_tex_coord );                    // Use texturing as well.
          vec3 bumped_N  = normalize( N + tex_color.rgb - .5*vec3(1,1,1) );      // Slightly disturb normals based on sampling
                                                                                 // the same image that was used for texturing.
                                                                                 
                                                                                 // Compute an initial (ambient) color:
          if( USE_TEXTURE ) gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
          else gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
          gl_FragColor.xyz += phong_model_lights( bumped_N );                    // Compute the final color with contributions from lights.
        }`;
    }
}


// window.Global_Info_Table = window.classes.Global_Info_Table =
// class Global_Info_Table extends Scene_Component                 // A class that just toggles, monitors, and reports some 
// { make_control_panel()                                          // global values via its control panel.
//     { const globals = this.globals;
//       globals.has_info_table = true;
//       this.key_triggered_button( "(Un)pause animation", ["Alt", "a"], function() { globals.animate ^= 1; } ); this.new_line();
//       this.live_string( box => { box.textContent = "Animation Time: " + ( globals.graphics_state.animation_time/1000 ).toFixed(3) + "s" } );
//       this.live_string( box => { box.textContent = globals.animate ? " " : " (paused)" } );  this.new_line();
//       this.key_triggered_button( "Gouraud shading",     ["Alt", "g"], function() { globals.graphics_state.gouraud       ^= 1;         } ); 
//       this.new_line();
//       this.key_triggered_button( "Normals shading",     ["Alt", "n"], function() { globals.graphics_state.color_normals ^= 1;         } ); 
//       this.new_line();
      
//       const label = this.control_panel.appendChild( document.createElement( "p" ) );
//       label.style = "align:center";
//       label.innerHTML = "A shared scratchpad is <br> accessible to all Scene_Components. <br> Navigate its values here:";

//       const show_object = ( element, obj = globals ) => 
//       { if( this.box ) this.box.innerHTML = "";
//         else this.box = element.appendChild( Object.assign( document.createElement( "div" ), { style: "overflow:auto; width: 200px" } ) );
//         if( obj !== globals )
//           this.box.appendChild( Object.assign( document.createElement( "div" ), { className:"link", innerText: "(back to globals)", 
//                                                onmousedown: () => this.current_object = globals } ) )
//         if( obj.to_string ) return this.box.appendChild( Object.assign( document.createElement( "div" ), { innerText: obj.to_string() } ) );
//         for( let [key,val] of Object.entries( obj ) )
//         { if( typeof( val ) == "object" ) 
//             this.box.appendChild( Object.assign( document.createElement( "a" ), { className:"link", innerText: key, 
//                                                  onmousedown: () => this.current_object = val } ) )
//           else
//             this.box.appendChild( Object.assign( document.createElement( "span" ), { innerText: key + ": " + val.toString() } ) );
//           this.box.appendChild( document.createElement( "br" ) );
//         }
//       }
//       this.live_string( box => show_object( box, this.current_object ) );      
//     }
// }

window.Movement_Controls = window.classes.Movement_Controls =
class Movement_Controls extends Scene_Component    // Movement_Controls is a Scene_Component that can be attached to a canvas, like any 
{                                                  // other Scene, but it is a Secondary Scene Component -- meant to stack alongside other
                                                   // scenes.  Rather than drawing anything it embeds both first-person and third-person
                                                   // style controls into the website.  These can be uesd to manually move your camera or
                                                   // other objects smoothly through your scene using key, mouse, and HTML button controls
                                                   // to help you explore what's in it.
  constructor( context, control_box, canvas = context.canvas )
    { super( context, control_box );
      [ this.context, this.roll, this.look_around_locked, this.invert ] = [ context, 0, true, true ];                  // Data members
      [ this.thrust, this.pos, this.z_axis ] = [ Vec.of( 0,0,0 ), Vec.of( 0,0,0 ), Vec.of( 0,0,0 ) ];
                                                 // The camera matrix is not actually stored here inside Movement_Controls; instead, track
                                                 // an external matrix to modify. This target is a reference (made with closures) kept
                                                 // in "globals" so it can be seen and set by other classes.  Initially, the default target
                                                 // is the camera matrix that Shaders use, stored in the global graphics_state object.
      this.target = function() { return context.globals.movement_controls_target() }
      context.globals.movement_controls_target = function(t) { return context.globals.graphics_state.camera_transform };
      context.globals.movement_controls_invert = this.will_invert = () => true;
      context.globals.has_controls = true;

      [ this.radians_per_frame, this.meters_per_frame, this.speed_multiplier ] = [ 1/200, 20, 1 ];
      
      // *** Mouse controls: ***
      this.mouse = { "from_center": Vec.of( 0,0 ) };                           // Measure mouse steering, for rotating the flyaround camera:
      const mouse_position = ( e, rect = canvas.getBoundingClientRect() ) => 
                                   Vec.of( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );
                                        // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas.
      document.addEventListener( "mouseup",   e => { this.mouse.anchor = undefined; } );
      canvas  .addEventListener( "mousedown", e => { e.preventDefault(); this.mouse.anchor      = mouse_position(e); } );
      canvas  .addEventListener( "mousemove", e => { e.preventDefault(); this.mouse.from_center = mouse_position(e); } );
      canvas  .addEventListener( "mouseout",  e => { if( !this.mouse.anchor ) this.mouse.from_center.scale(0) } );  
    }
  show_explanation( document_element ) { }
  make_control_panel()                                                        // This function of a scene sets up its keyboard shortcuts.
    { const globals = this.globals;
      this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
     this.key_triggered_button( "Up",     [ " " ], () => this.thrust[1] = -1, undefined, () => this.thrust[1] = 0 );
      this.key_triggered_button( "Forward",[ "w" ], () => this.thrust[2] =  1, undefined, () => this.thrust[2] = 0 );  this.new_line();
      this.key_triggered_button( "Left",   [ "a" ], () => this.thrust[0] =  1, undefined, () => this.thrust[0] = 0 );
      this.key_triggered_button( "Back",   [ "s" ], () => this.thrust[2] = -1, undefined, () => this.thrust[2] = 0 );
      this.key_triggered_button( "Right",  [ "d" ], () => this.thrust[0] = -1, undefined, () => this.thrust[0] = 0 );  this.new_line();
      this.key_triggered_button( "Down",   [ "z" ], () => this.thrust[1] =  1, undefined, () => this.thrust[1] = 0 ); 

      const speed_controls = this.control_panel.appendChild( document.createElement( "span" ) );
      speed_controls.style.margin = "30px";
      this.key_triggered_button( "-",  [ "o" ], () => this.speed_multiplier  /=  1.2, "green", undefined, undefined, speed_controls );
      this.live_string( box => { box.textContent = "Speed: " + this.speed_multiplier.toFixed(2) }, speed_controls );
      this.key_triggered_button( "+",  [ "p" ], () => this.speed_multiplier  *=  1.2, "green", undefined, undefined, speed_controls );
      this.new_line();
      this.key_triggered_button( "Roll left",  [ "," ], () => this.roll =  1, undefined, () => this.roll = 0 );
      this.key_triggered_button( "Roll right", [ "." ], () => this.roll = -1, undefined, () => this.roll = 0 );  this.new_line();
      this.key_triggered_button( "(Un)freeze mouse look around", [ "f" ], () => this.look_around_locked ^=  1, "green" );
      this.new_line();
      this.live_string( box => box.textContent = "Position: " + this.pos[0].toFixed(2) + ", " + this.pos[1].toFixed(2) 
                                                       + ", " + this.pos[2].toFixed(2) );
      this.new_line();        // The facing directions are actually affected by the left hand rule:
      this.live_string( box => box.textContent = "Facing: " + ( ( this.z_axis[0] > 0 ? "West " : "East ")
                   + ( this.z_axis[1] > 0 ? "Down " : "Up " ) + ( this.z_axis[2] > 0 ? "North" : "South" ) ) );
      this.new_line();     
  //    this.key_triggered_button( "Go to world origin", [ "r" ], () => this.target().set_identity( 4,4 ), "orange" );  this.new_line();
      this.key_triggered_button( "Attach to global camera", [ "Shift", "R" ], () => 
                                          globals.movement_controls_target = () => globals.graphics_state.camera_transform, "blue" );
      this.new_line();
    }
  first_person_flyaround( radians_per_frame, meters_per_frame, leeway = 70 )
    { const sign = this.will_invert ? 1 : -1;
      const do_operation = this.target()[ this.will_invert ? "pre_multiply" : "post_multiply" ].bind( this.target() );
                                                                      // Compare mouse's location to all four corners of a dead box.
      const offsets_from_dead_box = { plus: [ this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway ],
                                     minus: [ this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway ] }; 
                // Apply a camera rotation movement, but only when the mouse is past a minimum distance (leeway) from the canvas's center:
      if( !this.look_around_locked ) 
        for( let i = 0; i < 2; i++ )      // Steer according to "mouse_from_center" vector, but don't 
        {                                 // start increasing until outside a leeway window from the center.
          let o = offsets_from_dead_box,                                          // The &&'s in the next line might zero the vectors out:
            velocity = ( ( o.minus[i] > 0 && o.minus[i] ) || ( o.plus[i] < 0 && o.plus[i] ) ) * radians_per_frame;
          do_operation( Mat4.rotation( sign * velocity, Vec.of( i, 1-i, 0 ) ) );   // On X step, rotate around Y axis, and vice versa.
        }
      if( this.roll != 0 ) do_operation( Mat4.rotation( sign * .1, Vec.of(0, 0, this.roll ) ) );
                                                  // Now apply translation movement of the camera, in the newest local coordinate frame.
      do_operation( Mat4.translation( this.thrust.times( sign * meters_per_frame ) ) );
    }
  third_person_arcball( radians_per_frame )
    { const sign = this.will_invert ? 1 : -1;
      const do_operation = this.target()[ this.will_invert ? "pre_multiply" : "post_multiply" ].bind( this.target() );
      const dragging_vector = this.mouse.from_center.minus( this.mouse.anchor );               // Spin the scene around a point on an
      if( dragging_vector.norm() <= 0 ) return;                                                // axis determined by user mouse drag.
      do_operation( Mat4.translation([ 0,0, sign *  25 ]) );           // The presumed distance to the scene is a hard-coded 25 units.
      do_operation( Mat4.rotation( radians_per_frame * dragging_vector.norm(), Vec.of( dragging_vector[1], dragging_vector[0], 0 ) ) );
      do_operation( Mat4.translation([ 0,0, sign * -25 ]) );
    }
  display( graphics_state, dt = graphics_state.animation_delta_time / 1000 )    // Camera code starts here.
    { const m = this.speed_multiplier * this. meters_per_frame,
            r = this.speed_multiplier * this.radians_per_frame;
      this.first_person_flyaround( dt * r, dt * m );     // Do first-person.  Scale the normal camera aiming speed by dt for smoothness.
      if( this.mouse.anchor )                            // Also apply third-person "arcball" camera mode if a mouse drag is occurring.  
        this.third_person_arcball( dt * r);           
      
      const inv = Mat4.inverse( this.target() );
      this.pos = inv.times( Vec.of( 0,0,0,1 ) ); this.z_axis = inv.times( Vec.of( 0,0,1,0 ) );      // Log some values.
    }
 }

