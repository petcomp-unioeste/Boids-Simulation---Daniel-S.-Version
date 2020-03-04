let flock;
let turnHighlight = false;
// let sepSlider, aliSlider, cohSlider; // Sliders of each force


function setup() {
  createCanvas(screen.width, screen.height);
  createP("Change the sliders values to aplly the force.");
  createP("Separation -----------  Alignment  -----------  Cohesion");
  // drawArrow();

  flock = new Flock();

  // Add an initial set of boids into the system
  for (let i = 0; i < 10; i++) {
    let b = (i == 0) ? new Boid(width / 2, height / 2, true) : new Boid(width / 2, height / 2, false);
    flock.addBoid(b);
  }
}

function draw() {
  background(51);
  flock.run(turnHighlight);
}

function keyPressed(){
  if(key === 'h'){
    turnHighlight = !turnHighlight;
  }
}

// Add a new boid into the System
function mouseDragged() {
  if (keyIsDown(17)) {
    flock.addBoid(new Boid(mouseX, mouseY));
  }
}


// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Flock object
// Does very little, simply manages the array of all the boids

function Flock() {
  // An array for all the boids
  this.boids = []; // Initialize the array
  this.sepSlider = createSlider(0, 1.5, 0, 0.1);
  this.aliSlider = createSlider(0, 1.5, 0, 0.1);
  this.cohSlider = createSlider(0, 1.5, 0, 0.1);
}

Flock.prototype.run = function(turnHighlight){
  this.boids[0].highlight = turnHighlight;
  for (let i = 0; i < this.boids.length; i++) {
    this.boids[i].run(this.boids, this.sepSlider, this.aliSlider, this.cohSlider); // Passing the entire list of boids to each boid individually
  }
}

Flock.prototype.addBoid = function(b) {
  this.boids.push(b);
  if(this.boids.length > 100) this.boids.pop();
}

function drawArrow(base, vec, myColor) {
  push();
  stroke(myColor);
  strokeWeight(3);
  fill(myColor);
  translate(base.x, base.y);
  line(0, 0, vec.x, vec.y);
  rotate(vec.heading());
  let arrowSize = 7;
  translate(vec.mag() - arrowSize, 0);
  triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
  pop();
}

// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Boid class
// Methods for Separation, Cohesion, Alignment added

function Boid(x, y, highlight) {
  this.acceleration = createVector(0, 0);
  this.velocity = createVector(random(-1, 1), random(-1, 1));
  this.position = createVector(x, y);
  this.r = 3.0;
  this.maxspeed = 3; // Maximum speed
  this.maxforce = 0.05; // Maximum steering force
  this.highlight = highlight;
}

Boid.prototype.run = function(boids, sep, ali, coh) {
  this.flock(boids, sep, ali, coh);
  this.update();
  this.borders();
  this.render();
}

Boid.prototype.applyForce = function(force) {
  // We could add mass here if we want A = F / M
  this.acceleration.add(force);
}

// We accumulate a new acceleration each time based on three rules
Boid.prototype.flock = function(boids, sepSlider, aliSlider, cohSlider) {
  let sep = this.separate(boids); // Separation
  let ali = this.align(boids); // Alignment
  let coh = this.cohesion(boids); // Cohesion

  // Weight these forces according to the slider
  sep.mult(sepSlider.value());
  ali.mult(aliSlider.value());
  coh.mult(cohSlider.value());

  // console.log(sep.x, sep.y);

  // Add the force vectors to acceleration
  this.applyForce(sep);
  this.applyForce(ali);
  this.applyForce(coh);
}

// Method to update location
Boid.prototype.update = function() {
  // Update velocity
  this.velocity.add(this.acceleration);
  // Limit speed
  this.velocity.limit(this.maxspeed);
  this.position.add(this.velocity);
  // Reset accelertion to 0 each cycle
  this.acceleration.mult(0);
}

// A method that calculates and applies a steering force towards a target
// STEER = DESIRED MINUS VELOCITY
Boid.prototype.seek = function(target) {
  let desired = p5.Vector.sub(target, this.position); // A vector pointing from the location to the target
  // Normalize desired and scale to maximum speed
  desired.normalize();
  desired.mult(this.maxspeed);
  // Steering = Desired minus Velocity
  let steer = p5.Vector.sub(desired, this.velocity);
  steer.limit(this.maxforce); // Limit to maximum steering force
  return steer;
}

Boid.prototype.render = function() {
  // Draw a triangle rotated in the direction of velocity
  let theta = this.velocity.heading() + radians(90);
  if (this.highlight) {
    noFill();
    circle(this.position.x, this.position.y, 100);
    // let v0 = createVector(620, 20);
    // let v1 = createVector(0, 20); 
    // drawArrow(v0, v1.rotate(this.velocity.heading()), 'white');
    fill(0, 255, 0);
  } else {
    if (this.interacting) {
      fill(0, 0, 255);
    } else {
      fill(127);
    }
  }
  stroke(200);
  push();
  translate(this.position.x, this.position.y);
  rotate(theta);
  beginShape();
  vertex(0, -this.r * 2);
  vertex(-this.r, this.r * 2);
  vertex(this.r, this.r * 2);
  endShape(CLOSE);
  pop();
}

// Wraparound
Boid.prototype.borders = function() {
  if (this.position.x < -this.r) this.position.x = width + this.r;
  if (this.position.y < -this.r) this.position.y = height + this.r;
  if (this.position.x > width + this.r) this.position.x = -this.r;
  if (this.position.y > height + this.r) this.position.y = -this.r;
}

// Separation
// Method checks for nearby boids and steers away
Boid.prototype.separate = function(boids) {
  let desiredseparation = 25.0;
  let steer = createVector(0, 0);
  let count = 0;

  if(key) {
    boids[0].highlight = !boids[0].highlight;
  }
  // For every boid in the system, check if it's too close
  for (let i = 0; i < boids.length; i++) {
    let d = p5.Vector.dist(this.position, boids[i].position);
    // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
    if ((d > 0) && (d < desiredseparation)) {
      // Calculate vector pointing away from neighbor
      let diff = p5.Vector.sub(this.position, boids[i].position);
      diff.normalize();
      diff.div(d); // Weight by distance
      steer.add(diff);
      count++; // Keep track of how many
    }
  }
  // Average -- divide by how many
  if (count > 0) {
    steer.div(count);
  }

  // As long as the vector is greater than 0
  if (steer.mag() > 0) {
    // Implement Reynolds: Steering = Desired - Velocity
    steer.normalize();
    steer.mult(this.maxspeed);
    steer.sub(this.velocity);
    steer.limit(this.maxforce);
  }
  return steer;
}

// Alignment
// For every nearby boid in the system, calculate the average velocity
Boid.prototype.align = function(boids) {
  let neighbordist = 50;
  let sum = createVector(0, 0);
  let count = 0;
  for (let i = 0; i < boids.length; i++) {
    let d = p5.Vector.dist(this.position, boids[i].position);
    if ((d > 0) && (d < neighbordist)) {
      if (this.highlight) {
        stroke(255, 0, 0);
        line(this.position.x, this.position.y, boids[i].position.x, boids[i].position.y);
      }
      sum.add(boids[i].velocity);
      count++;
    }
  }
  if (count > 0) {
    sum.div(count);
    sum.normalize();
    sum.mult(this.maxspeed);
    let steer = p5.Vector.sub(sum, this.velocity);
    steer.limit(this.maxforce);
    return steer;
  } else {
    return createVector(0, 0);
  }
}

// Cohesion
// For the average location (i.e. center) of all nearby boids, calculate steering vector towards that location
Boid.prototype.cohesion = function(boids) {
  let neighbordist = 50;
  let sum = createVector(0, 0); // Start with empty vector to accumulate all locations
  let count = 0;
  for (let i = 0; i < boids.length; i++) {
    let d = p5.Vector.dist(this.position, boids[i].position);
    if ((d > 0) && (d < neighbordist)) {
      sum.add(boids[i].position); // Add location
      count++;
    }
  }
  if (count > 0) {
    sum.div(count);
    return this.seek(sum); // Steer towards the location
  } else {
    return createVector(0, 0);
  }
}