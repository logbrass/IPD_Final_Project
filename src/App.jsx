import { useState } from 'react'
import './index.css'

const videos = [
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "Amnesia: The Dark Descent - Part 1",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "PewDiePie",
    subscribers: "110M",
    type: "oldest",
    views: "50M views",
    uploadDate: "10 years ago"
  },
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "I Bought The World's Largest Mystery Box! ($500,000)",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "MrBeast",
    subscribers: "150M",
    type: "oldest",
    views: "200M views",
    uploadDate: "8 years ago"
  },
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "Five Nights at Freddy's - Part 1",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "Markiplier",
    subscribers: "35M",
    type: "oldest",
    views: "30M views",
    uploadDate: "9 years ago"
  },
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "Building a $5000 Gaming PC",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "Linus Tech Tips",
    subscribers: "15M",
    type: "oldest",
    views: "15M views",
    uploadDate: "11 years ago"
  },
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "How To Count Past Infinity",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "Vsauce",
    subscribers: "18M",
    type: "oldest",
    views: "25M views",
    uploadDate: "12 years ago"
  },
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "Minecraft: The Early Days",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "CaptainSparklez",
    subscribers: "12M",
    type: "oldest",
    views: "20M views",
    uploadDate: "10 years ago"
  },
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "First Ever Cooking Video",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "Binging with Babish",
    subscribers: "8M",
    type: "oldest",
    views: "12M views",
    uploadDate: "7 years ago"
  },
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "The Science of Everything - Pilot",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "SciShow",
    subscribers: "7M",
    type: "oldest",
    views: "8M views",
    uploadDate: "13 years ago"
  },
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "Welcome to My Channel!",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "Smarter Every Day",
    subscribers: "11M",
    type: "oldest",
    views: "5M views",
    uploadDate: "14 years ago"
  },
  {
    id: "dQw4w9WgXcQ", // Placeholder
    title: "My First Vlog",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    creator: "Lindsay Ellis",
    subscribers: "1.2M",
    type: "oldest",
    views: "2M views",
    uploadDate: "15 years ago"
  }
]

const creatorPopularVideos = {
  "PewDiePie": [
    { id: "dQw4w9WgXcQ", title: "Minecraft But Every Like Makes It Faster", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "I Played The SCARIEST Game Ever", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "Reacting to Viral TikToks", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" }
  ],
  "MrBeast": [
    { id: "dQw4w9WgXcQ", title: "I Built 100 Houses And Gave Them Away!", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "$1 vs $1,000,000 Hotel Room!", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "I Survived 50 Hours In Antarctica", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" }
  ],
  "Markiplier": [
    { id: "dQw4w9WgXcQ", title: "In Space with Markiplier: Part 1", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "Five Nights at Freddy's: Sister Location", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "Reading Your Comments", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" }
  ],
  "Linus Tech Tips": [
    { id: "dQw4w9WgXcQ", title: "I Bought an ABANDONED DATA CENTER", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "Building a $10,000 Dream Gaming Setup", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "The Fastest PC Money Can Buy", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" }
  ],
  "Vsauce": [
    { id: "dQw4w9WgXcQ", title: "The Man Who Corrected Einstein", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "How Many Universes Are There?", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
    { id: "dQw4w9WgXcQ", title: "The Banach-Tarski Paradox", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" }
  ]
}

function VideoCard({ video, onSelect }) {
  return (
    <div className="video-card" onClick={() => onSelect(video)}>
      <div className="video-thumbnail-container">
        <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
      </div>
      <div className="video-info">
        <h3>{video.title}</h3>
        <p className="video-creator">{video.creator}</p>
        <p className="video-stats">{video.views} • {video.uploadDate}</p>
      </div>
    </div>
  )
}

function PopularVideoCard({ video, onSelect }) {
  return (
    <div className="popular-video-card" onClick={() => onSelect(video)}>
      <img src={video.thumbnail} alt={video.title} className="popular-thumbnail" />
      <h4>{video.title}</h4>
    </div>
  )
}

function VideoPlayer({ video }) {
  return (
    <div className="video-player">
      <iframe
        src={`https://www.youtube.com/embed/${video.id}`}
        title={video.title}
        allowFullScreen
      ></iframe>
      <h3>{video.title}</h3>
      <p>{video.creator}</p>
    </div>
  )
}

function App() {
  const [selectedVideo, setSelectedVideo] = useState(null)

  const handleHome = () => {
    setSelectedVideo(null)
  }

  const handleSelectVideo = (video) => {
    setSelectedVideo(video)
  }

  const handleSelectPopularVideo = (video) => {
    setSelectedVideo(video)
  }

  return (
    <div className="App">
      <header>
        <h1 onClick={handleHome} style={{cursor: 'pointer'}}>Youtube History</h1>
        <p>Explore the earliest videos from major YouTube creators <span className="blink">✨</span></p>
        {selectedVideo && (
          <button className="home-btn" onClick={handleHome}>🏠 Home</button>
        )}
      </header>
      <main>
        {!selectedVideo ? (
          <section id="explore">
            <h2>Explore Oldest Videos</h2>
            <div id="videos-grid">
              {videos.map((video, index) => (
                <VideoCard key={index} video={video} onSelect={handleSelectVideo} />
              ))}
            </div>
          </section>
        ) : (
          <section id="video-view">
            <div className="selected-video">
              <VideoPlayer video={selectedVideo} />
            </div>
            <div className="popular-videos">
              <h3>Popular Videos from {selectedVideo.creator}</h3>
              <div className="popular-grid">
                {creatorPopularVideos[selectedVideo.creator]?.map((video, index) => (
                  <PopularVideoCard key={index} video={video} onSelect={handleSelectPopularVideo} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <div className="counter">
        Visitors: 1337
      </div>
    </div>
  )
}

export default App