# Example Usage

This document provides examples of how to use the key features of the social media dashboard.

## Interior Design API Integration

The dashboard integrates with the Reimagine Home API to transform interior design images.

### 1. Interior Design Service

The API key is configured in the environment variables:

```typescript
const API_KEY = "your_api_key"
const API_ENDPOINT = "https://api.reimaginehome.ai/api/v1/interior-design"
```

### Basic Usage

Here's a basic example of transforming an interior image:

```typescript
// Create form data for the API request
const formData = new FormData()
formData.append('image_file', imageFile)

// Add design options
const options = {
  style: 'modern',
  roomType: 'livingRoom',
  lighting: 'softDaylight',
  flooring: 'hardwood',
  furniture: 'modern'
}

// Add options to form data
Object.entries(options).forEach(([key, value]) => {
  formData.append(key, value)
})

// Call the API
const response = await fetch('https://api.reimaginehome.ai/api/v1/interior-design', {
  method: 'POST',
  headers: {
    'x-api-key': '686d8281f0bdbfed5cb8f049'
  },
  body: formData
})

if (!response.ok) {
  throw new Error(`API request failed with status ${response.status}`)
}

const blob = await response.blob()
const imageUrl = URL.createObjectURL(blob)
```

### Advanced Usage

For more complex transformations, you can add additional parameters:

```typescript
// Create form data
const formData = new FormData()
formData.append('image_file', imageFile)

// Advanced options
const options = {
  style: 'minimalist',
  roomType: 'office',
  lighting: 'brightNatural',
  flooring: 'hardwood',
  furniture: 'modern',
  customInstructions: 'Focus on creating a productive workspace with ergonomic furniture'
}

// Add options to form data
Object.entries(options).forEach(([key, value]) => {
  formData.append(key, value)
})

// Call the API
const response = await fetch('https://api.reimaginehome.ai/api/v1/interior-design', {
  method: 'POST',
  headers: {
    'x-api-key': '686d8281f0bdbfed5cb8f049'
  },
  body: formData
})

if (!response.ok) {
  throw new Error(`API request failed with status ${response.status}`)
}

const blob = await response.blob()
const imageUrl = URL.createObjectURL(blob)
```

### Environment Variables

The following environment variables need to be configured:

```env
REIMAGINE_HOME_API_KEY=your-api-key
```

### Testing

You can test the API connection using the test endpoint:

```typescript
const response = await fetch('https://api.reimaginehome.ai/api/v1/interior-design/test', {
  method: 'GET',
  headers: {
    'x-api-key': process.env.REIMAGINE_HOME_API_KEY
  }
})

if (response.ok) {
  console.log('API connection successful')
} else {
  console.error('API connection failed')
}
``` 