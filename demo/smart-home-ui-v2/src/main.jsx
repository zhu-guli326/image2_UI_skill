import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { UiIcon } from "./UiIcon.jsx";
import "./styles.css";

const roomFilters = ["Living Room", "Master Bedroom", "Kitchen"];

const quickActions = [
  { id: "heat", label: "Heat", icon: "thermometer" },
  { id: "cold", label: "Cold", icon: "cold" },
  { id: "air", label: "Air", icon: "air" },
  { id: "humid", label: "Humid", icon: "droplet" },
];

const deviceCards = [
  { name: "Speaker", count: "2 devices", detail: "Living Room", product: "speaker", sheet: true, on: false },
  { name: "Google Nest", count: "3 devices", detail: "Hallway", product: "nest", sheet: true, on: true },
  { name: "Camera", count: "2 devices", detail: "Entry", product: "camera", image: "/generated/device-camera-cutout.png", on: true },
  { name: "A/C", count: "3 devices", detail: "Bedroom", product: "ac", sheet: true, on: false },
  { name: "Smart TV", count: "1 device", detail: "Studio", product: "tv", sheet: true, on: false },
  { name: "Lamp", count: "2 devices", detail: "Dining", product: "lamp", image: "/generated/device-lamp-cutout.png", on: true },
];

function App() {
  const [temperature, setTemperature] = useState(16);
  const [homeRoom, setHomeRoom] = useState("Living Room");
  const [climateRoom, setClimateRoom] = useState("Living Room");
  const [activeAction, setActiveAction] = useState("air");
  const [cameraOn, setCameraOn] = useState(true);
  const [roomDevices, setRoomDevices] = useState(() => Object.fromEntries(deviceCards.map((device) => [device.name, device.on])));

  function toggleRoomDevice(name) {
    setRoomDevices((current) => ({ ...current, [name]: !current[name] }));
  }

  return (
    <main className="stage">
      <section className="phone-row" aria-label="Smart home three screen recreation">
        <PhoneFrame className="phone-side phone-left" label="Good Evening home screen">
          <HomeScreen
            activeRoom={homeRoom}
            cameraOn={cameraOn}
            setActiveRoom={setHomeRoom}
            setCameraOn={setCameraOn}
            temperature={temperature}
          />
        </PhoneFrame>

        <PhoneFrame className="phone-center" label="Air conditioner control screen">
          <ClimateScreen
            activeAction={activeAction}
            activeRoom={climateRoom}
            setActiveAction={setActiveAction}
            setActiveRoom={setClimateRoom}
            setTemperature={setTemperature}
            temperature={temperature}
          />
        </PhoneFrame>

        <PhoneFrame className="phone-side phone-right" label="Living room device screen">
          <RoomScreen deviceStates={roomDevices} onToggleDevice={toggleRoomDevice} temperature={temperature} />
        </PhoneFrame>
      </section>
    </main>
  );
}

function PhoneFrame({ children, className = "", label }) {
  return (
    <article className={`phone ${className}`} aria-label={label}>
      <div className="screen">
        <StatusBar />
        {children}
        <div className="home-indicator" aria-hidden="true" />
      </div>
    </article>
  );
}

function StatusBar() {
  return (
    <div className="status-bar" aria-label="Device status bar">
      <span>9:41</span>
      <div className="status-icons" aria-hidden="true">
        <UiIcon name="signal" size={12} weight="fill" />
        <UiIcon name="wifi" size={12} weight="bold" />
        <UiIcon name="battery" size={16} weight="regular" />
      </div>
    </div>
  );
}

function IconButton({ label, icon, onClick, variant = "ghost", size = 18 }) {
  return (
    <button className={`icon-button ${variant}`} type="button" aria-label={label} onClick={onClick}>
      <UiIcon name={icon} size={size} weight="bold" />
    </button>
  );
}

function HomeScreen({ activeRoom, cameraOn, setActiveRoom, setCameraOn, temperature }) {
  return (
    <div className="view home-view">
      <header className="home-header">
        <div>
          <p className="eyebrow">Hello, Henry</p>
          <h1>Good Evening</h1>
        </div>
        <button className="humidity-pill" type="button" aria-label="Humidity">
          <UiIcon name="fan" size={16} weight="bold" />
          <span>{temperature}°C</span>
          <small>Humid</small>
        </button>
      </header>

      <section className="energy-card">
        <div className="energy-mark">
          <UiIcon name="lightning" size={21} weight="fill" />
        </div>
        <div className="energy-copy">
          <strong>85</strong>
          <span>kw/h</span>
          <p className="sr-only">Last updated 27 minutes ago</p>
        </div>
        <svg className="energy-wave" viewBox="0 0 112 48" aria-hidden="true">
          <path d="M6 31 C20 9, 35 9, 49 31 S76 51, 106 18" />
        </svg>
      </section>

      <div className="chip-row home-chips" aria-label="Room filters">
        <IconButton label="Add room" icon="plus" variant="dark" size={17} />
        {roomFilters.map((room) => (
          <button
            className={activeRoom === room ? "chip active" : "chip"}
            key={room}
            type="button"
            onClick={() => setActiveRoom(room)}
          >
            {room}
          </button>
        ))}
      </div>

      <section className="living-card">
        <img src="/generated/living-room-hero.png" alt="Bright living room interior" />
        <div className="living-shade" />
        <div className="living-meta">
          <strong>80%</strong>
          <IconButton label="Open living room details" icon="next" variant="translucent" size={16} />
          <div className="living-temp">
            <b>16.7°</b>
            <span>Living Room</span>
            <small className="sr-only">Cooling Mode</small>
          </div>
        </div>
      </section>

      <section className="player-card" aria-label="Living room speaker player">
        <div className="player-title">
          <h2>Speaker</h2>
          <p className="sr-only">Living Room</p>
        </div>
        <div className="progress-row">
          <span>2:40</span>
          <div className="track"><i /></div>
          <span>8:20</span>
        </div>
        <div className="player-controls">
          <IconButton label="Previous track" icon="previous" size={15} />
          <IconButton label="Play" icon="play" variant="dark" size={15} />
          <IconButton label="Next track" icon="next" size={15} />
        </div>
      </section>

      <div className="mini-grid">
        <MiniDevice title="Lamp" subtitle="4 hr use" value="80%" image="/generated/device-lamp-cutout.png" product="lamp" active />
        <MiniDevice
          title="Camera"
          subtitle="10 hr use"
          value="Live view"
          image="/generated/device-camera-cutout.png"
          product="camera"
          active={cameraOn}
          onToggle={() => setCameraOn((value) => !value)}
        />
      </div>
    </div>
  );
}

function ClimateScreen({ activeAction, activeRoom, setActiveAction, setActiveRoom, setTemperature, temperature }) {
  return (
    <div className="view climate-view">
      <header className="nav-header">
        <IconButton label="Back" icon="back" size={17} />
        <h1>Air Conditioner</h1>
        <IconButton label="Settings" icon="settings" size={17} />
      </header>

      <div className="segmented" aria-label="Air conditioner room selection">
        {["Living Room", "Bedroom"].map((room) => (
          <button
            className={activeRoom === room ? "selected" : ""}
            key={room}
            type="button"
            onClick={() => setActiveRoom(room)}
          >
            {room}
          </button>
        ))}
      </div>

      <section className="dial-zone" aria-label="Temperature control">
        <div className="dial-scale">
          <span className="tick tick-left">10°</span>
          <span className="tick tick-top">20°</span>
          <span className="tick tick-right">25°</span>
          <span className="tick tick-low">10°</span>
          <span className="tick tick-high">30°</span>
          <div className="dial-arc" />
          <div className="dial-dot" />
          <div className="dial-center">
            <strong>{temperature}°</strong>
            <span>Now</span>
          </div>
        </div>

        <div className="temperature-controls">
          <IconButton label="Decrease temperature" icon="minus" onClick={() => setTemperature((value) => Math.max(10, value - 1))} />
          <IconButton label="Toggle air conditioner" icon="power" variant="accent" size={20} />
          <IconButton label="Increase temperature" icon="plus" onClick={() => setTemperature((value) => Math.min(30, value + 1))} />
        </div>
      </section>

      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          {quickActions.map((action) => (
            <button
              className={activeAction === action.id ? "action-item active" : "action-item"}
              key={action.id}
              type="button"
              onClick={() => setActiveAction(action.id)}
            >
              <UiIcon name={action.icon} size={21} weight="bold" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="schedule-card">
        <span className="schedule-dot"><UiIcon name="fan" size={15} weight="bold" /></span>
        <div>
          <h2>Set Automatic Schedule</h2>
          <p className="sr-only">Start the device automatically</p>
        </div>
        <IconButton label="Add schedule" icon="plus" variant="dark" size={16} />
      </section>
    </div>
  );
}

function RoomScreen({ deviceStates, onToggleDevice, temperature }) {
  return (
    <div className="view room-view">
      <section className="room-photo">
        <img src="/generated/living-room-hero.png" alt="Living room with seating and coffee table" />
        <div className="room-photo-top">
          <IconButton label="Back" icon="back" size={17} />
          <h1>Living Room</h1>
          <IconButton label="More options" icon="more" size={17} />
        </div>
      </section>

      <div className="room-stats">
        <button type="button"><UiIcon name="speaker" size={16} weight="bold" />{temperature}°C</button>
        <button type="button"><UiIcon name="lightning" size={16} weight="fill" />47 kw/h</button>
      </div>

      <section className="device-grid" aria-label="Living room devices">
        {deviceCards.map((device) => (
          <DeviceCard
            device={device}
            key={device.name}
            on={deviceStates[device.name]}
            onToggle={() => onToggleDevice(device.name)}
          />
        ))}
      </section>
    </div>
  );
}

function MiniDevice({ active, image, onToggle, product, subtitle, title, value }) {
  return (
    <article className="mini-device" aria-label={`${title}, ${subtitle}, ${value}`}>
      <h2>{title}</h2>
      <p className="sr-only">{subtitle}</p>
      <ProductThumb image={image} name={title} type={product} />
      <button className="tiny-toggle" type="button" aria-label={`Toggle ${title}`} aria-pressed={active} onClick={onToggle}>
        <span />
      </button>
      <small>{value}</small>
    </article>
  );
}

function DeviceCard({ device, on, onToggle }) {
  const status = on ? "On" : "Off";
  const summary = `${device.name}, ${device.count}, ${device.detail}, ${status}`;

  return (
    <article
      aria-label={summary}
      className={on ? `device-card active product-${device.product}` : `device-card product-${device.product}`}
      title={summary}
    >
      <div className="device-copy">
        <h2>{device.name}</h2>
        <p className="device-count">{device.count}</p>
        <span className="sr-only">{device.detail}</span>
      </div>
      <div className="device-art" data-asset-role="device-product-slot">
        <ProductThumb image={device.image} name={device.name} sheet={device.sheet} type={device.product} />
      </div>
      <button
        aria-label={`${status}. Toggle ${device.name}`}
        className="device-toggle"
        type="button"
        aria-pressed={on}
        onClick={onToggle}
      >
        <span>{status}</span>
        <i><b /></i>
      </button>
    </article>
  );
}

function ProductThumb({ image, name, sheet, type }) {
  if (image) {
    return (
      <img
        alt={`${name} product`}
        className={`product-thumb image-thumb ${type}`}
        data-asset-role="device-product-image"
        src={image}
      />
    );
  }

  if (sheet) {
    return (
      <span
        aria-label={`${name} product`}
        className={`product-thumb sheet-thumb ${type}`}
        data-asset-role="device-product-image"
        role="img"
        style={{ backgroundImage: "url('/generated/device-sheet.png')" }}
      />
    );
  }

  return (
    <span className={`product-thumb css-product ${type}`} aria-label={`${name} product`} role="img">
      <span />
      <i />
      <b />
    </span>
  );
}

createRoot(document.getElementById("root")).render(<App />);
