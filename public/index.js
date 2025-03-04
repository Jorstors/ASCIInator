let inputBox = document.getElementById("input");
let inputButton = document.getElementById("convert");
let copyButton = document.getElementById("copy");
let outputBox = document.getElementById("output");
let userInput = "";
let loadingID;
let imageDescriptor = document.getElementById("image-descriptor");
let plusButton = document.getElementById("plus-button");
let minusButton = document.getElementById("minus-button");
let recievedASCII = false;
let currentSize = 69; // Default size of the ASCII art

inputBox.addEventListener("keyup", function (event) {
  if (event.key === "Enter" && inputBox.value) {
    userInput = inputBox.value;
    imageDescriptor.innerText = `"${userInput}"`;
    // Clear the input and output boxes
    outputBox.innerText = "";
    inputBox.value = "";
    // If there is a spinner running, clear it
    if (loadingID) clearSpinner();
    loadingID = loading();
    recievedASCII = false;
    // Call the API with the user input
    prompt();
  }
});

inputButton.addEventListener("click", function () {
  if (!inputBox.value) return;
  userInput = inputBox.value;
  imageDescriptor.innerText = `"${userInput}"`;
  // Clear the input and output boxes
  outputBox.innerText = "";
  inputBox.value = "";
  // If there is a spinner running, clear it
  if (loadingID) clearSpinner();
  loadingID = loading();
  recievedASCII = false;
  // Call the API with the user input
  prompt();
});

copyButton.addEventListener("click", function () {
  // Copy the text from the output div
  let rawText = outputBox.innerText;
  // Clean up text a little: remove trailing whitepsace and blank lines
  var text = rawText.replace(/\s+$/mg, "").replace(/\n{2,}/g, "\n");
  if (text.startsWith("\n")) text = text.slice(1);
  let lines = text.split("\n");
  let minSpaces = Math.min(...lines.map(line => line.match(/^\s*/)[0].length));
  text = lines.map(line => line.slice(minSpaces)).join("\n");
  navigator.clipboard.writeText(text);
  console.log("Copied to clipboard!");
});

// PLUS MINUS BUTTONS
plusButton.addEventListener("click", function () {
  if (!recievedASCII) return;
  sizeChangeDebounced(1);
});

minusButton.addEventListener("click", function () {
  if (!recievedASCII) return;
  sizeChangeDebounced(-1);
});

async function sizeChange(pos) {
  // Send a request to the backend to send a larger ASCII art
  console.log("Current size:", currentSize);

  if (!recievedASCII) return;
  if (currentSize < 2) {
    currentSize += 4;
    return;
  }
  if (currentSize >= 250) {
    currentSize -= 4;
    return;
  }

  const string = userInput;
  const baseUrl = `/get-art?prompt=${string}&size=${currentSize}`;
  const response = await fetch(baseUrl);
  if (!response.ok) {
    loadingID = loading();
    throw new Error("Network response was not ok");
  }
  const data = await response.text();
  // Update the output box with the ASCII art
  clearSpinner();
  outputBox.innerText = data;
  recievedASCII = true;
}

// Debounced version of the prompt function
function debounceSizeChange(func, timeout = 5 * 1000) {
  let timer;
  return (...args) => {
    // Scale the ASCII art up or down
    if (args.at(-1) < 0) currentSize -= 4;
    else currentSize += 4;

    // If no timer is set, call the function immediately
    if (!timer) {
      func(...args);
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

const sizeChangeDebounced = debounceSizeChange(sizeChange, 1 * 1000);

// ASCII LOADER

let asciiSpinner = "▉▊▋▍▎▏▎▍▋▊▉";

function loading() {
  // Set the font size large enough to see the spinner
  outputBox.style.fontSize = "2.5rem";
  // Every 700ms, update the spinner in the output div
  let i = 0;
  return setInterval(() => {
    outputBox.innerText = "▉▉▉" + asciiSpinner[i];
    i += 1;
    if (i >= asciiSpinner.length) {
      i = 0;
    }
  }, 200);
}

// Stop the spinner
function clearSpinner() {
  clearInterval(loadingID);
  // Grab variable from css
  outputBox.style.fontSize = "var(--ASCII-font-size)";
}

// API call to backend through HTTPS request
async function promptAPI() {
  const string = userInput;

  const baseUrl = `/get-art?prompt=${string}&size=`;
  for (var i = 2; i < currentSize; i += 1) {
    try {
      const response = await fetch(baseUrl + i);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.text();
      // Update the output box with the ASCII art
      clearSpinner();
      outputBox.innerText = data;
      recievedASCII = true;
    } catch (error) {
      // If an error occurs, display an error message and break the loop
      clearSpinner();

      // Load placeholder ASCII art in the output box
      fetch("public/notavailable.txt")
        .then((response) => response.text())
        .then((data) => {
          outputBox.innerHTML = data;
        })
        .catch((error) =>
          console.error("Error loading error ASCII art:", error)
        );
      recievedASCII = false;
      // Log the error
      console.error("Error fetching data:", error);
      break;
    }
  }
}

// Debounced version of the prompt function
function debounce(func, timeout = 5 * 1000) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

const prompt = debounce(promptAPI, 3 * 1000);

// Load placeholder ASCII art in the output box
fetch("public/wormy.txt")
  .then((response) => response.text())
  .then((data) => {
    outputBox.innerHTML = data;
  })
  .catch((error) =>
    console.error("Error loading placeholder ASCII art:", error)
  );
