const display = document.getElementById("display");
const preview = document.getElementById("preview");
const historyContainer = document.getElementById("history");
const themeBtn = document.getElementById("theme-btn");

/* =========================
HISTORY
========================= */
loadHistory();

function addToHistory(expression, result) {
    const item = document.createElement("div");
    item.textContent = `${expression} = ${result}`;
    historyContainer.append(item); // Appends to bottom naturally for this layout
    saveHistory();
}

function saveHistory() {
    localStorage.setItem("calculatorHistory", historyContainer.innerHTML);
}

function loadHistory() {
    const saved = localStorage.getItem("calculatorHistory");
    if (saved) {
        historyContainer.innerHTML = saved;
    }
}

/* =========================
INPUT HANDLING
========================= */
function appendToDisplay(input) {
    if (display.value === "Error") {
        display.value = "";
    }

    const operators = ['+', '-', '*', '/'];
    const lastChar = display.value.slice(-1);

    if (input === ".") {
        if (!canAddDecimal()) return;
    }

    if (operators.includes(input)) {
        if (display.value === "") {
            if (input !== "-") return;
        }

        if (operators.includes(lastChar)) {
            display.value = display.value.slice(0, -1) + input;
            updatePreview();
            return;
        }
    }

    display.value += input;
    display.scrollLeft = display.scrollWidth;
    updatePreview();
}

function clearDisplay() {
    display.value = "";
    preview.textContent = "";
}

function deleteLastCharacter() {
    display.value = display.value.slice(0, -1);
    updatePreview();
}

/* =========================
DECIMAL VALIDATION
========================= */
function canAddDecimal() {
    const parts = display.value.split(/[+\-*/()]/);
    const currentNumber = parts[parts.length - 1];
    return !currentNumber.includes(".");
}

/* =========================
PARENTHESES VALIDATION & AUTO-FIX
========================= */
function validateParentheses(expression) {
    let count = 0;
    for (const char of expression) {
        if (char === "(") count++;
        if (char === ")") count--;
        if (count < 0) return false; 
    }
    return count; 
}

/* =========================
TOKENIZER
========================= */
function tokenize(expression) {
    const tokens = [];
    let number = "";

    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];

        if ("0123456789.".includes(char)) {
            number += char;
        } else {
            if (number) {
                tokens.push(number);
                number = "";
            }

            if (char === "-" && (i === 0 || "+-*/(".includes(expression[i - 1]))) {
                number = "-";
            } else {
                tokens.push(char);
            }
        }
    }

    if (number) tokens.push(number);
    return tokens;
}

/* =========================
SHUNTING YARD
========================= */
function toRPN(tokens) {
    const output = [];
    const operators = [];
    const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };

    for (const token of tokens) {
        if (!isNaN(token)) {
            output.push(token);
        } else if (token in precedence) {
            while (
                operators.length &&
                operators[operators.length - 1] in precedence &&
                precedence[operators[operators.length - 1]] >= precedence[token]
            ) {
                output.push(operators.pop());
            }
            operators.push(token);
        } else if (token === "(") {
            operators.push(token);
        } else if (token === ")") {
            while (operators.length && operators[operators.length - 1] !== "(") {
                output.push(operators.pop());
            }
            operators.pop();
        }
    }

    while (operators.length) {
        output.push(operators.pop());
    }

    return output;
}

/* =========================
RPN EVALUATOR
========================= */
function evaluateRPN(rpn) {
    const stack = [];

    for (const token of rpn) {
        if (!isNaN(token) && token !== ".") {
            stack.push(Number(token));
        } else {
            const b = stack.pop();
            const a = stack.pop();

            if (a === undefined || b === undefined) return undefined;

            switch (token) {
                case "+": stack.push(a + b); break;
                case "-": stack.push(a - b); break;
                case "*": stack.push(a * b); break;
                case "/": 
                    if (b === 0) return "Error";
                    stack.push(a / b); 
                    break;
            }
        }
    }
    return stack[0];
}

/* =========================
EXPRESSION EVALUATION
========================= */
function evaluateExpression(expression) {
    const tokens = tokenize(expression);
    const rpn = toRPN(tokens);
    return evaluateRPN(rpn);
}

/* =========================
PREVIEW
========================= */
function updatePreview() {
    try {
        let expr = display.value;
        if (expr === "") {
            preview.textContent = "";
            return;
        }

        const missingClosedParens = validateParentheses(expr);
        
        if (missingClosedParens === false) {
            preview.textContent = "";
            return;
        }

        if (missingClosedParens > 0) {
            expr += ")".repeat(missingClosedParens);
        }

        const result = evaluateExpression(expr);

        if (result !== undefined && !Number.isNaN(result) && result !== "Error") {
            let formattedResult = result;
            if (!Number.isInteger(result)) {
                formattedResult = Math.round(result * 1e8) / 1e8;
            }
            preview.textContent = "= " + formattedResult;
        } else {
            preview.textContent = "";
        }
    } catch {
        preview.textContent = "";
    }
}

/* =========================
CALCULATE
========================= */
function calculate() {
    try {
        if (validateParentheses(display.value) !== 0) {
            throw new Error();
        }

        const expression = display.value;
        let result = evaluateExpression(expression);

        if (result === undefined || Number.isNaN(result) || result === "Error") {
            throw new Error();
        }

        if (typeof result === "number" && !Number.isInteger(result)) {
            result = Math.round(result * 1e8) / 1e8; 
        }

        addToHistory(expression, result);
        display.value = result;
        preview.textContent = "";
        
        // Auto-scroll history to bottom
        historyContainer.parentElement.scrollTop = historyContainer.parentElement.scrollHeight;

    } catch {
        display.value = "Error";
        preview.textContent = "";
    }
}

/* =========================
BUTTON EVENTS
========================= */
document.querySelectorAll("[data-value]").forEach(button => {
    button.addEventListener("click", () => {
        appendToDisplay(button.dataset.value);
    });
});

document.getElementById("clear-btn").addEventListener("click", clearDisplay);
document.getElementById("delete-btn").addEventListener("click", deleteLastCharacter);
document.getElementById("equals-btn").addEventListener("click", calculate);

/* =========================
THEME TOGGLE
========================= */
themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    localStorage.setItem("theme", document.body.classList.contains("light"));
});

if (localStorage.getItem("theme") === "true") {
    document.body.classList.add("light");
}

/* =========================
KEYBOARD SUPPORT
========================= */
document.addEventListener("keydown", event => {
    const key = event.key;
    if ("0123456789+-*/().".includes(key)) {
        appendToDisplay(key);
    }
    if (key === "Enter") {
        event.preventDefault(); // Prevents triggering last clicked button
        calculate();
    }
    if (key === "Backspace") {
        deleteLastCharacter();
    }
    if (key === "Escape") {
        clearDisplay();
    }
});