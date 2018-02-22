// Global THREE, AFRAME
const POSES = {
  open: "open",
  point: "point",
  pointThumb: "point",
  fist: "grip",
  hold: "grip",
  thumbUp: "thumbup"
};

AFRAME.registerComponent("animated-robot-hands", {
  schema: {
    leftHand: { type: "selector", default: "#left-hand" },
    rightHand: { type: "selector", default: "#right-hand" }
  },

  init: function() {
    this.playAnimation = this.playAnimation.bind(this);
    this.onModelLoaded = this.onModelLoaded.bind(this);
    this.el.addEventListener("model-loaded", this.onModelLoaded);
  },

  onModelLoaded: function() {
    // Get the three.js object in the scene graph that has the animation data
    const root = this.el.object3D.children[0].children[0].children[0];
    this.mixer = new THREE.AnimationMixer(root);

    // Set hands to open pose because the bind pose is funky due
    // to the workaround for FBX2glTF animations.
    this.openL = this.mixer.clipAction("open_L");
    this.openR = this.mixer.clipAction("open_R");
    this.openL.play();
    this.openR.play();

    this.loaded = true;
  },

  play: function() {
    this.data.leftHand.addEventListener("hand-pose", this.playAnimation);
    this.data.rightHand.addEventListener("hand-pose", this.playAnimation);
  },

  pause: function() {
    this.data.leftHand.removeEventListener("hand-pose", this.playAnimation);
    this.data.rightHand.removeEventListener("hand-pose", this.playAnimation);
  },

  tick: function(t, dt) {
    if (!this.loaded) return;
    this.mixer.update(dt / 1000);
  },

  // Animate from pose to pose.
  // TODO: Transition from current pose (which may be BETWEEN two other poses)
  //       to the target pose, rather than stopping previous actions altogether.
  playAnimation: function(evt) {
    if (!this.loaded) return;
    const { current, previous } = evt.detail;
    var mixer = this.mixer;
    const isLeft = evt.target === this.data.leftHand;
    if (!this.openLStopped && isLeft) {
      this.openL.stop();
      this.openLStopped = true;
    } else if (!this.openRStopped && !isLeft) {
      this.openR.stop();
      this.openRStopped = true;
    }
    const suffix = isLeft ? "_L" : "_R";
    const prevPose = POSES[previous] + suffix;
    const currPose = POSES[current] + suffix;

    // STOP previous actions playing for this hand.
    if (this["pose" + suffix + "_to"] !== undefined) {
      this["pose" + suffix + "_to"].stop();
    }
    if (this["pose" + suffix + "_from"] !== undefined) {
      this["pose" + suffix + "_from"].stop();
    }

    const duration = 0.065;
    var from = mixer.clipAction(prevPose);
    var to = mixer.clipAction(currPose);
    from.fadeOut(duration);
    to.fadeIn(duration);
    to.play();
    from.play();
    // Update the mixer slightly to prevent one frame of the default pose
    // from appearing. TODO: Find out why that happens
    this.mixer.update(0.001);

    this["pose" + suffix + "_to"] = to;
    this["pose" + suffix + "_from"] = from;

    // console.log(`Animating ${isLeft ? "left" : "right"} hand from ${prevPose} to ${currPose} over ${duration} seconds.`);
  }
});
