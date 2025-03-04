let inputBox = document.getElementById("input");
let inputButton = document.getElementById("convert");
let copyButton = document.getElementById("copy");
let outputBox = document.getElementById("output");
let userInput = "";
let loadingID = 0;
let imageDescriptor = document.getElementById("image-descriptor");
let plusButton = document.getElementById("plus-button");
let minusButton = document.getElementById("minus-button");
let recievedASCII = false;
let currentSize = 60; // Default size of the ASCII art

let currentArt = new Map();

inputBox.addEventListener("keyup", function (event) {
  if (event.key === "Enter" && inputBox.value) {
    userInput = inputBox.value;
    imageDescriptor.innerText = `"${userInput}"`;
    // Clear the input and output boxes
    outputBox.innerText = "";
    inputBox.value = "";
    // If there is a spinner running, clear it
    loading();
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
  loading();
  recievedASCII = false;
  // Call the API with the user input
  prompt();
});

copyButton.addEventListener("click", function () {
  // Copy the text from the output div
  let rawText = outputBox.innerText;
  // Clean up text a little: remove trailing whitepsace and blank lines
  let text = rawText.replace(/\s+$/mg, "").replace(/\n{2,}/g, "\n");
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

async function getSize(size) {
  if (!currentArt.has(size)) {
    recievedASCII = false;
    const string = userInput;
    const baseUrl = `/api/v1/get-art?prompt=${string}&size=${size}`;
    const response = await fetch(baseUrl);
    if (!response.ok) {
      loading();
      throw new Error(await response.text());
    }
    const resp = await response.text();
    const data = JSON.parse(resp);
    for (const [key, value] of Object.entries(data)) {
      currentArt.set(parseInt(key), value);
    }
    recievedASCII = true;
  }
  return currentArt.get(size);
}

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

  const art = await getSize(currentSize);
  // Update the output box with the ASCII art
  clearSpinner();
  outputBox.innerText = art;
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
  if (loadingID) {
    clearSpinner();
  }
  // Set the font size large enough to see the spinner
  outputBox.style.fontSize = "2.5rem";
  // Update the spinner in the output div repeatedly
  let i = 0;
  loadingID = setInterval(() => {
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

function handleError(error) {
  clearSpinner();
  recievedASCII = false;
  const msg = error.message;
  if (msg.startsWith("{")) {
    const data = JSON.parse(msg);
    console.error("Error fetching data:", data.message);
    outputBox.innerText = data.figlet;
    return;
  }

  // Load placeholder ASCII art in the output box
  fetch("public/notavailable.txt")
    .then((response) => response.text())
    .then((data) => {
      outputBox.innerHTML = data;
    })
    .catch((error) =>
      console.error("Error loading error ASCII art:", error)
    );
  // Log the error
  console.error("Error fetching data:", error);
}

// API call to backend through HTTPS request
async function promptAPI() {
  currentArt.clear();
  let i = 4;
  async function loadNext() {
    try {
      const text = await getSize(i);
      clearSpinner();
      outputBox.innerText = text;
    } catch (error) {
      handleError(error);
      return;
    }
    i += 4;
    if (i <= currentSize) {
      setTimeout(loadNext, 100);
    }
  }
  loadNext();
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
