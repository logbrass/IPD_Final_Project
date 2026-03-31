import { useState } from 'react'
import './index.css'

const creators = [
  {
    name: "PewDiePie",
    subscribers: "110M",
    earliestVideo: {
      title: "Amnesia: The Dark Descent - Part 1",
      id: "dQw4w9WgXcQ" // Placeholder
    },
    recentVideo: {
      title: "Minecraft But Every Like Makes It Faster",
      id: "dQw4w9WgXcQ" // Placeholder
    }
  },
  {
    name: "MrBeast",
    subscribers: "150M",
    earliestVideo: {
      title: "I Bought The World's Largest Mystery Box! ($500,000)",
      id: "dQw4w9WgXcQ" // Placeholder
    },
    recentVideo: {
      title: "I Built 100 Houses And Gave Them Away!",
      id: "dQw4w9WgXcQ" // Placeholder
    }
  },
  {
    name: "Markiplier",
    subscribers: "35M",
    earliestVideo: {
      title: "Five Nights at Freddy's - Part 1",
      id: "dQw4w9WgXcQ" // Placeholder
    },
    recentVideo: {
      title: "In Space with Markiplier: Part 1",
      id: "dQw4w9WgXcQ" // Placeholder
    }
  },
  {
    name: "Linus Tech Tips",
    subscribers: "15M",
    earliestVideo: {
      title: "Building a $5000 Gaming PC",
      id: "dQw4w9WgXcQ" // Placeholder
    },
    recentVideo: {
      title: "I Bought an ABANDONED DATA CENTER",
      id: "dQw4w9WgXcQ" // Placeholder
    }
  },
  {
    name: "Vsauce",
    subscribers: "18M",
    earliestVideo: {
      title: "How To Count Past Infinity",
      id: "dQw4w9WgXcQ" // Placeholder
    },
    recentVideo: {
      title: "The Man Who Corrected Einstein",
      id: "dQw4w9WgXcQ" // Placeholder
    }
  }
]

function CreatorCard({ creator, onSelect }) {
  return (
    <div className="creator-card" onClick={() => onSelect(creator)}>
      <h3>{creator.name}</h3>
      <p>Subscribers: {creator.subscribers}</p>
      <p>Earliest Video: {creator.earliestVideo.title}</p>
    </div>
  )
}

function VideoPlayer({ video, title }) {
  return (
    <div className="video-container">
      <h3>{title}</h3>
      <iframe
        src={`https://www.youtube.com/embed/${video.id}`}
        title={video.title}
        allowFullScreen
      ></iframe>
      <p>{video.title}</p>
    </div>
  )
}

function App() {
  const [selectedCreator, setSelectedCreator] = useState(null)

  const handleHome = () => {
    setSelectedCreator(null)
  }

  const handleSelectCreator = (creator) => {
    setSelectedCreator(creator)
  }

  return (
    <div className="App">
      <header>
        <h1 onClick={handleHome} style={{cursor: 'pointer'}}>Youtube History</h1>
        <p>Discover how major YouTube creators have evolved from their earliest videos to their current content.</p>
        {selectedCreator && (
          <button className="home-btn" onClick={handleHome}>🏠 Home</button>
        )}
      </header>
      <main>
        {!selectedCreator ? (
          <section id="explore">
            <h2>Explore Major Creators</h2>
            <div id="creators-list">
              {creators.map((creator, index) => (
                <CreatorCard key={index} creator={creator} onSelect={handleSelectCreator} />
              ))}
            </div>
          </section>
        ) : (
          <section id="contrast-view">
            <h2>Contrast View: {selectedCreator.name}</h2>
            <div id="video-comparison">
              <VideoPlayer video={selectedCreator.earliestVideo} title="Earliest Video" />
              <VideoPlayer video={selectedCreator.recentVideo} title="Recent Video" />
            </div>
            <button id="back-btn" onClick={handleHome}>Back to Explore</button>
          </section>
        )}
      </main>
    </div>
  )
}

export default App