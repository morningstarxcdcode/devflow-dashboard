# DevFlow API Documentation 📡

## Overview
DevFlow integrates with multiple APIs to provide comprehensive open source insights.

## GitHub API Integration

### Authentication
```javascript
// Personal Access Token (Recommended)
const token = 'ghp_your_token_here';

// OAuth Flow (Advanced)
const clientId = 'your_client_id';
const clientSecret = 'your_client_secret'; // Backend only
```

### API Endpoints Used

#### User Information
```javascript
GET /user
GET /users/{username}
GET /users/{username}/repos
GET /users/{username}/events
```

#### Repository Data  
```javascript
GET /repos/{owner}/{repo}
GET /repos/{owner}/{repo}/issues
GET /repos/{owner}/{repo}/contributors
GET /repos/{owner}/{repo}/languages
```

#### Search & Discovery
```javascript
GET /search/repositories
GET /search/issues
GET /search/users
```

### Rate Limiting
- Authenticated: 5,000 requests/hour
- Unauthenticated: 60 requests/hour
- DevFlow automatically manages rate limits

## Database Schema

### IndexedDB Structure
```javascript
// Users Store
{
  id: number,
  login: string,
  name: string,
  email: string,
  avatar_url: string,
  preferences: object,
  last_login: string
}

// Repositories Store  
{
  id: number,
  full_name: string,
  name: string,
  description: string,
  stargazers_count: number,
  language: string,
  ai_score: number,
  difficulty: string
}

// Contributions Store
{
  id: string,
  user_id: number,
  repository: string,
  type: string, // 'commit', 'pr', 'issue'
  impact_score: number,
  created_at: string
}
```

## AI Engine API

### Recommendation Algorithm
```javascript
// Generate personalized recommendations
const recommendations = await aiEngine.generateRecommendations(
  repositories,    // Array of repo objects
  userSkills,     // Array of skill strings  
  limit          // Number of results
);
```

### Scoring System
```javascript
// Calculate repository match score
const score = calculateRecommendationScore({
  stars: repo.stargazers_count,
  activity: recentActivity,
  language: languageMatch,
  complexity: estimatedComplexity,
  userSkillMatch: skillBonus
});
```

## Data Sources

### Real GitHub Data
- ✅ Live repository information
- ✅ Real user profiles  
- ✅ Actual issue data
- ✅ Trending repositories
- ✅ Language statistics

### Enhanced Metadata
- 🤖 AI-generated difficulty scores
- 📊 Community health metrics
- ⏱️ Estimated contribution time
- 🎯 Skill matching scores
- 📈 Trend predictions

## Error Handling

### API Error Responses
```javascript
{
  error: "GitHub API Error",
  status: 401,
  message: "Bad credentials",
  documentation_url: "https://docs.github.com/rest"
}
```

### Error Recovery
- Automatic retry with exponential backoff
- Graceful degradation to cached data
- User-friendly error notifications
- Offline mode activation

## Caching Strategy

### Data Caching
- Repository data: 1 hour
- User data: 30 minutes  
- Search results: 15 minutes
- Trending data: 5 minutes

### Storage Locations
- IndexedDB: Persistent user data
- localStorage: Settings and preferences
- sessionStorage: Temporary UI state
- Memory: API response cache

## Security

### Data Protection
- No sensitive data stored locally
- GitHub tokens encrypted in transit
- HTTPS required for production
- CSP headers for XSS protection

### Privacy
- No personal data collection
- Local-first data storage
- User controls all data
- GDPR compliant

## Performance

### Optimization Strategies
- Lazy loading of components
- Virtual scrolling for large lists
- Image compression and WebP support
- Service Worker caching
- CDN for static assets

### Monitoring
- Core Web Vitals tracking
- Error rate monitoring
- API response time metrics
- User interaction analytics

---

For more technical details, check the source code documentation in each module.
