(() => {
  // The width and height of the captured photo. We will set the
  // width to the value defined here, but the height will be
  // calculated based on the aspect ratio of the input stream.

  let width = 320; // We will scale the photo width to this
  let height = 0; // This will be computed based on the input stream

  // |streaming| indicates whether or not we're currently streaming
  // video from the camera. Obviously, we start at false.

  let streaming = false;
  let video_ready = false;
  let frame_index = 0;
  // open websocket connection
  let socket = io.connect(null, { transports: ["websocket"] });
  // socket = io.connect(null, {port: 5000, rememberTransport: false});
  // socket = io.connect(null, { rememberTransport: false });
  let result = null;

  // The various HTML elements we need to configure or control. These
  // will be set by the startup() function.
  let video = null;
  let canvas = null;
  let photo = null;

  // let startbutton = null;

  socket.on("result", function (received_result) {
    result = received_result;
    // Resend the actions to do each time
    // (the server can restart without the client noticing)
    selected_actions();
    requestAnimationFrame(push_frame);
  });

  // socket.on("selected_actions", function (send_selected_action) {
  //   selected_actions();
  // });

  // some function that take a frame, retrieve the form data and send it all to the server
  // the form code is in the html file
  // <form id="add_face_form" action="javascript:add_face()">
  //   <input type="text" id="name" name="name" placeholder="Name">
  //   <input type="hidden" id="id" name="id" value="0">
  //   <input type="submit" value="Add face">
  // </form>

  function add_face() {
    const name = document.getElementById("name").value;
    const id = document.getElementById("id").value;
    const context = canvas.getContext("2d");
    const data = canvas.toDataURL("image/png");
    socket.emit("add_face", {
      frame_index: frame_index,
      frame_data: data,
      name: name,
      id: id,
    });
  }

  function get_selected_radio_value(name) {
    const radios = document.getElementsByName(name);
    for (let i = 0; i < radios.length; i++) {
      if (radios[i].checked) {
        return radios[i].value;
      }
    }
    return null;
  }

  function selected_actions() {
    // get the checked actions from the input (checkboxes)
    // checkbox_emotion, checkbox_age, checkbox_sex, checkbox_ethnicity
    // and send them to the server
    const checkbox_emotion = document.getElementById("checkbox_emotion");
    const checkbox_age = document.getElementById("checkbox_age");
    const checkbox_sex = document.getElementById("checkbox_sex");
    const checkbox_ethnicity = document.getElementById("checkbox_ethnicity");

    const actions = {
      emotion: checkbox_emotion.checked,
      age: checkbox_age.checked,
      sex: checkbox_sex.checked,
      ethnicity: checkbox_ethnicity.checked,
      detection_backend: get_selected_radio_value("detection_backend"),
      representation_backend: get_selected_radio_value(
        "representation_backend"
      ),
    };
    console.log("selected_actions", actions);
    socket.emit("selected_actions", actions);
  }

  function showViewLiveResultButton() {
    if (window.self !== window.top) {
      // Ensure that if our document is in a frame, we get the user
      // to first open it in its own tab or window. Otherwise, it
      // won't be able to request permission for camera access.
      document.querySelector(".contentarea").remove();
      // const button = document.createElement("button");
      // button.textContent = "View live result of the example code above";
      // document.body.append(button);
      // button.addEventListener("click", () => window.open(location.href));
      return true;
    }
    return false;
  }

  function prettify_result(result) {
    // prettify the result
    console.log("prettify_result", result);
    if (result) {
      return result.result;
    }
  }

  function startup() {
    // if (showViewLiveResultButton()) {
    //   return;
    // }
    video = document.getElementById("video");
    canvas = document.getElementById("canvas");
    photo = document.getElementById("photo");
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error(`An error occurred: ${err}`);
      });

    selected_actions();

    video.addEventListener(
      "canplay",
      (ev) => {
        if (!streaming) {
          width = video.videoWidth;
          height = video.videoHeight; /// (video.videoWidth / width);
          console.log("videoWidth", width);
          console.log("videoHeight", height);

          // Firefox currently has a bug where the height can't be read from
          // the video, so we will make assumptions if this happens.

          if (isNaN(height)) {
            height = width / (4 / 3);
          }

          video.setAttribute("width", width);
          video.setAttribute("height", height);
          canvas.setAttribute("width", width);
          canvas.setAttribute("height", height);
          streaming = true;
          video_ready = true;
        }
      },
      false
    );

    // add event listener to the add face button
    document
      .getElementById("add_face_button")
      .addEventListener("click", add_face);

    // add event listener to the checkboxes
    document
      .getElementById("checkbox_emotion")
      .addEventListener("change", selected_actions);

    document
      .getElementById("checkbox_sex")
      .addEventListener("change", selected_actions);

    document
      .getElementById("checkbox_age")
      .addEventListener("change", selected_actions);

    document
      .getElementById("checkbox_ethnicity")
      .addEventListener("change", selected_actions);

    // add event listener to the radio buttons for the detection backend
    elements = document.getElementsByName("detection_backend");

    for (let i = 0; i < elements.length; i++) {
      elements[i].addEventListener("change", selected_actions);
    }

    // add event listener to the radio buttons for the detection backend
    elements = document.getElementsByName("representation_backend");

    for (let i = 0; i < elements.length; i++) {
      elements[i].addEventListener("change", selected_actions);
    }
    // Start the animation
    // requestAnimationFrame(push_frame);
  }

  // Fill the photo with an indication that none has been
  // captured.

  function clearphoto() {
    // Empties the canvas
    const context = canvas.getContext("2d");
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL("image/png");
    photo.setAttribute("src", data);
  }

  // Add canvas animation
  async function push_frame() {
    // Push the current frame to the server
    // console.log("push_frame");
    frame_index += 1;

    while (!video_ready) {
      // wait for the video to be ready
      await new Promise((resolve) => setTimeout(resolve, 5));
      // console.log("waiting for video");
    }

    const context = canvas.getContext("2d");
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);

      const data = canvas.toDataURL("image/png");
      photo.setAttribute("src", data);
      socket.emit("frame", { frame_index: frame_index, frame_data: data });

      // while ((result && result.frame_index < frame_index)) {
      //   // console.log("result", result);
      //   // wait for the result to be updated
      //   await new Promise((resolve) => setTimeout(resolve, 5));
      //   console.log("waiting for result");
      // }

      if (result) {
        // console.log("got result");
        // console.log(result);

        // write result to canvas to div class="analysis_results"
        const analysis_results = document.getElementById("analysis_results");
        analysis_results.innerHTML = prettify_result(result);
      }
    } else {
      clearphoto();
    }
    // requestAnimationFrame(push_frame);
  }

  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener("load", startup, false);
})();
