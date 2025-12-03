/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useRef, useState, useCallback} from 'react'
import c from 'clsx'
import {
  snapPhoto,
  setMode,
  deletePhoto,
  setCustomPrompt
} from '../lib/actions'
import useStore from '../lib/store'
import imageData from '../lib/imageData'
import modes from '../lib/modes'

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
const modeKeys = Object.keys(modes)

export default function App() {
  const photos = useStore.use.photos()
  const customPrompt = useStore.use.customPrompt()
  const activeMode = useStore.use.activeMode()
  const [videoActive, setVideoActive] = useState(false)
  const [didInitVideo, setDidInitVideo] = useState(false)
  const [focusedId, setFocusedId] = useState(null)
  const [didJustSnap, setDidJustSnap] = useState(false)
  const [hoveredMode, setHoveredMode] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({top: 0, left: 0})
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const videoRef = useRef(null)

  const startVideo = async () => {
    setDidInitVideo(true)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {width: {ideal: 1920}, height: {ideal: 1080}},
      audio: false,
      facingMode: {ideal: 'user'}
    })
    setVideoActive(true)
    videoRef.current.srcObject = stream

    const {width, height} = stream.getVideoTracks()[0].getSettings()
    const squareSize = Math.min(width, height)
    canvas.width = squareSize
    canvas.height = squareSize
  }

  const takePhoto = () => {
    const video = videoRef.current
    const {videoWidth, videoHeight} = video
    const squareSize = canvas.width
    const sourceSize = Math.min(videoWidth, videoHeight)
    const sourceX = (videoWidth - sourceSize) / 2
    const sourceY = (videoHeight - sourceSize) / 2

    ctx.clearRect(0, 0, squareSize, squareSize)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      -squareSize,
      0,
      squareSize,
      squareSize
    )
    snapPhoto(canvas.toDataURL('image/jpeg'))
    setDidJustSnap(true)
    setTimeout(() => setDidJustSnap(false), 1000)
  }

  const downloadImage = () => {
    const a = document.createElement('a')
    a.href = imageData.outputs[focusedId]
    a.download = 'gembooth.jpg'
    a.click()
  }

  const handleModeHover = useCallback((modeInfo, event) => {
    if (!modeInfo) {
      setHoveredMode(null)
      return
    }

    setHoveredMode(modeInfo)

    const rect = event.currentTarget.getBoundingClientRect()
    const tooltipTop = rect.top
    const tooltipLeft = rect.left + rect.width / 2

    setTooltipPosition({
      top: tooltipTop,
      left: tooltipLeft
    })
  }, [])

  if (!isAuthenticated) {
    return (
      <main style={{justifyContent: 'center', alignItems: 'center'}}>
        <form
          onSubmit={e => {
            e.preventDefault()
            if (passwordInput === 'samyoke') {
              setIsAuthenticated(true)
            } else {
              setPasswordError(true)
              setPasswordInput('')
            }
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center'
          }}
        >
          <div style={{textAlign: 'center'}}>
            <h1>🔒 GemBooth</h1>
            <p style={{color: '#888', fontSize: '14px', marginTop: '5px'}}>
              Enter password to continue
            </p>
          </div>
          <input
            type="password"
            autoFocus
            placeholder="Password"
            value={passwordInput}
            onChange={e => {
              setPasswordInput(e.target.value)
              setPasswordError(false)
            }}
            style={{
              background: '#111',
              border: `1px solid ${passwordError ? '#e53935' : '#333'}`,
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center',
              width: '220px',
              color: '#fff'
            }}
          />
          <button className="button" style={{width: '100%'}}>
            Enter
          </button>
        </form>
      </main>
    )
  }

  return (
    <main>
      <div
        className="video"
        onClick={() => {
          setFocusedId(null)
        }}
      >
        {showCustomPrompt && (
          <div className="customPrompt">
            <button
              className="circleBtn"
              onClick={() => {
                setShowCustomPrompt(false)

                if (customPrompt.trim().length === 0) {
                  setMode(modeKeys[0])
                }
              }}
            >
              <span className="icon">close</span>
            </button>
            <textarea
              type="text"
              placeholder="Enter a custom prompt"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setShowCustomPrompt(false)
                }
              }}
            />
          </div>
        )}
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          disablePictureInPicture="true"
        />
        {didJustSnap && <div className="flash" />}
        {!videoActive && (
          <button className="startButton" onClick={startVideo}>
            <h1>📸 GemBooth</h1>
            <p>{didInitVideo ? 'One sec…' : 'Tap anywhere to start webcam'}</p>
          </button>
        )}

        {videoActive && (
          <div className="videoControls">
            <button onClick={takePhoto} className="shutter">
              <span className="icon">camera</span>
            </button>

            <ul className="modeSelector">
              <li
                key="custom"
                onMouseEnter={e =>
                  handleModeHover({key: 'custom', prompt: customPrompt}, e)
                }
                onMouseLeave={() => handleModeHover(null)}
              >
                <button
                  className={c({active: activeMode === 'custom'})}
                  onClick={() => {
                    setMode('custom')
                    setShowCustomPrompt(true)
                  }}
                >
                  <span>✏️</span> <p>Custom</p>
                </button>
              </li>
              {Object.entries(modes).map(([key, {name, emoji, prompt}]) => (
                <li
                  key={key}
                  onMouseEnter={e => handleModeHover({key, prompt}, e)}
                  onMouseLeave={() => handleModeHover(null)}
                >
                  <button
                    onClick={() => setMode(key)}
                    className={c({active: key === activeMode})}
                  >
                    <span>{emoji}</span> <p>{name}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {focusedId && (
          <div className="focusedPhoto" onClick={e => e.stopPropagation()}>
            <button
              className="circleBtn"
              onClick={() => {
                setFocusedId(null)
              }}
            >
              <span className="icon">close</span>
            </button>
            <img
              src={imageData.outputs[focusedId]}
              alt="photo"
              draggable={false}
            />
            <button className="button downloadButton" onClick={downloadImage}>
              Download
            </button>
          </div>
        )}
      </div>

      <div className="results">
        <ul>
          {photos.length
            ? photos.map(({id, mode, isBusy}) => (
                <li className={c({isBusy})} key={id}>
                  <button
                    className="circleBtn deleteBtn"
                    onClick={() => {
                      deletePhoto(id)
                      if (focusedId === id) {
                        setFocusedId(null)
                      }
                    }}
                  >
                    <span className="icon">delete</span>
                  </button>
                  <button
                    className="photo"
                    onClick={() => {
                      if (!isBusy) {
                        setFocusedId(id)
                      }
                    }}
                  >
                    <img
                      src={
                        isBusy ? imageData.inputs[id] : imageData.outputs[id]
                      }
                      draggable={false}
                    />
                    <p className="emoji">
                      {mode === 'custom' ? '✏️' : modes[mode].emoji}
                    </p>
                  </button>
                </li>
              ))
            : videoActive && (
                <li className="empty" key="empty">
                  <p>
                    👉 <span className="icon">camera</span>
                  </p>
                  Snap a photo to get started.
                </li>
              )}
        </ul>
      </div>

      {hoveredMode && (
        <div
          className={c('tooltip', {isFirst: hoveredMode.key === 'custom'})}
          role="tooltip"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translateX(-50%)'
          }}
        >
          {hoveredMode.key === 'custom' && !hoveredMode.prompt.length ? (
            <p>Click to set a custom prompt</p>
          ) : (
            <>
              <p>"{hoveredMode.prompt}"</p>
              <h4>Prompt</h4>
            </>
          )}
        </div>
      )}
    </main>
  )
}