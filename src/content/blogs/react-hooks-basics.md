---
title: "Understanding useState and useEffect in React"
author: "BlogLabs Admin"
date: 2025-05-20
summary: "A beginner-friendly guide to React's fundamental hooks for managing state and side effects in functional components."
---

React hooks allow you to use state and other React features without writing a class. They were introduced in React 16.8 to make functional components more powerful and reusable.

`useState` is the most basic hook, allowing you to add React state to functional components. It returns a pair: the current state value and a function that lets you update it.

```jsx
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

`useEffect` lets you perform side effects in functional components. It serves a similar purpose to `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount` in React class components, but unified into a single API.

Common use cases for `useEffect` include data fetching, setting up subscriptions, and manually changing the DOM.

```javascript
import React, { useState, useEffect } from 'react';

function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prevSeconds => prevSeconds + 1);
    }, 1000);

    // Cleanup function
    return () => clearInterval(interval);
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  return (
    <div>
      <p>Seconds: {seconds}</p>
    </div>
  );
}
