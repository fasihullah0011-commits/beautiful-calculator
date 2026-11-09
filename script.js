(() => {
  const expressionView = document.querySelector('#expression');
  const resultView = document.querySelector('#result');
  const resultCaption = document.querySelector('#result-caption');
  const keypad = document.querySelector('#keypad');

  let expression = '';
  let justEvaluated = false;

  // Recursive-descent parser: supports arithmetic, parentheses, unary signs, and postfix percentages.
  // Avoids eval() so calculator input is always treated as math, never executable code.
  function calculate(source) {
    const tokens = source.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/%]/g);
    if (!tokens || tokens.join('') !== source.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').replaceAll(/\s/g, '')) {
      throw new Error('Invalid expression');
    }
    let position = 0;
    const peek = () => tokens[position];
    const take = () => tokens[position++];

    function primary() {
      if (peek() === '+' || peek() === '-') {
        const sign = take() === '-' ? -1 : 1;
        return sign * primary();
      }
      let value;
      if (peek() === '(') {
        take();
        value = sum();
        if (take() !== ')') throw new Error('Missing closing parenthesis');
      } else {
        const token = take();
        if (token === undefined || !/^\d*\.?\d+$/.test(token)) throw new Error('Expected a number');
        value = Number(token);
      }
      while (peek() === '%') { take(); value /= 100; }
      return value;
    }
    function product() {
      let value = primary();
      while (peek() === '*' || peek() === '/') {
        const operator = take();
        const right = primary();
        if (operator === '/' && right === 0) throw new Error('Cannot divide by zero');
        value = operator === '*' ? value * right : value / right;
      }
      return value;
    }
    function sum() {
      let value = product();
      while (peek() === '+' || peek() === '-') {
        const operator = take();
        const right = product();
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    }
    const value = sum();
    if (position !== tokens.length || !Number.isFinite(value)) throw new Error('Invalid result');
    return value;
  }

  function format(value) {
    if (!Number.isFinite(value)) return 'Error';
    const rounded = Number.parseFloat(value.toPrecision(12));
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(rounded);
  }

  function render() {
    expressionView.textContent = expression || '0';
    if (!expression) {
      resultView.textContent = '0';
      resultCaption.textContent = 'RESULT';
      return;
    }
    try {
      resultView.textContent = format(calculate(expression));
      resultCaption.textContent = 'LIVE RESULT';
    } catch {
      resultView.textContent = '—';
      resultCaption.textContent = 'RESULT';
    }
  }

  function append(value) {
    if (justEvaluated && /[\d.(]/.test(value)) expression = '';
    justEvaluated = false;
    expression += value;
    render();
  }

  function press(action, value) {
    if (action === 'clear') {
      expression = '';
      justEvaluated = false;
    } else if (action === 'backspace') {
      expression = expression.slice(0, -1);
      justEvaluated = false;
    } else if (action === 'equals') {
      if (!expression) return;
      try {
        const answer = calculate(expression);
        expression = String(Number.parseFloat(answer.toPrecision(12)));
        justEvaluated = true;
      } catch {
        resultView.textContent = 'Check expression';
        resultCaption.textContent = 'NOT QUITE';
        return;
      }
    } else if (value) {
      append(value);
      return;
    }
    render();
  }

  keypad.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    press(button.dataset.action, button.dataset.value);
  });

  document.addEventListener('keydown', (event) => {
    if (/^[0-9.]$/.test(event.key)) append(event.key);
    else if (event.key === '+') append('+');
    else if (event.key === '-') append('−');
    else if (event.key === '*') append('×');
    else if (event.key === '/') { event.preventDefault(); append('÷'); }
    else if (event.key === '%') append('%');
    else if (event.key === '(' || event.key === ')') append(event.key);
    else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); press('equals'); }
    else if (event.key === 'Backspace') press('backspace');
    else if (event.key === 'Escape' || event.key === 'Delete') press('clear');
  });

  render();
})();
