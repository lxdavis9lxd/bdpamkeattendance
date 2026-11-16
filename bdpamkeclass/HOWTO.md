# How-To Guides

## How to Add a New Page

1. **Create the page component** in `src/views/`:

```jsx
// src/views/Dashboard.jsx
import React from "react";
import Container from "../components/layout/Container";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <Container>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <Card>
        <p>Welcome to your dashboard!</p>
      </Card>
    </Container>
  );
}
```

2. **Add the route** in `src/App.jsx`:

```jsx
import Dashboard from "./views/Dashboard";
// ... other imports

function AppRoutes() {
  const pathname = usePathname();
  if (pathname === "/dashboard") return <Dashboard />;
  return <Home />;
}
```

3. **Add navigation link** (optional) in `src/components/ui/Navbar.jsx` or `Sidebar.jsx`:

```jsx
import Link from "next/link";

<Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
  Dashboard
</Link>
```

## How to Make a REST API Call

The scaffold includes an Axios-based API client in `src/utils/api.js` with built-in CRUD methods.

### Basic API Configuration

Set your API base URL in `next.config.mjs` rewrites (the app already proxies `/api/*` to the Express server):

```bash
/api/* -> http://localhost:5000/api/*
```

### Making API Calls

```jsx
import { useState, useEffect } from "react";
import api from "../utils/api";

function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // GET request - Fetch all items
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.getAll("/students");
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // GET request - Fetch single item
  const fetchStudent = async (id) => {
    try {
      const response = await api.getById("/students", id);
      console.log(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // POST request - Create new item
  const createStudent = async () => {
    try {
      const newStudent = { name: "Ada Lovelace", grade: "A" };
      const response = await api.create("/students", newStudent);
      setData([...data, response.data]);
    } catch (err) {
      setError(err.message);
    }
  };

  // PUT request - Update item
  const updateStudent = async (id) => {
    try {
      const updates = { name: "Grace Hopper" };
      const response = await api.update(`/students/${id}`, updates);
      setData(data.map(item => item.id === id ? response.data : item));
    } catch (err) {
      setError(err.message);
    }
  };

  // DELETE request - Remove item
  const deleteStudent = async (id) => {
    try {
      await api.delete(`/students/${id}`);
      setData(data.filter(item => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {/* Render your data here */}
    </div>
  );
}
```

### Available API Methods

- `api.getAll(endpoint)` - GET all items
- `api.getById(endpoint, id)` - GET single item
- `api.create(endpoint, data)` - POST new item
- `api.update(endpoint, data)` - PUT update item
- `api.delete(endpoint)` - DELETE item
- `api.setToken(token)` - Set authorization token

### Custom API Client

Create a custom client for different base URLs:

```js
import { ApiClient } from "./utils/api";

const adminApi = new ApiClient("https://admin.example.com");
adminApi.setToken("your-jwt-token");

const response = await adminApi.getAll("/users");
```
