import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { UiIcon } from "./UiIcon.jsx";
import "./styles.css";

const tabs = [
  { id: "home", label: "Home", icon: "home" },
  { id: "climate", label: "Climate", icon: "air" },
  { id: "room", label: "Rooms", icon: "tv" },
];

const devices = [
  { name: "Speaker", area: "Living room", icon: "speaker", on: false, meta: "2 devices" },
  { name: "Google Nest", area: "Hallway", icon: "thermometer", on: true, meta: "3 devices" },
  { name: "Camera", area: "Entry", icon: "camera", on: true, meta: "2 devices" },
  { name: "A/C", area: "Bedroom", icon: "air", on: false, meta: "3 devices" },
  { name: "Smart TV", area: "Studio", icon: "tv", on: false, meta: "1 device" },
  { name: "Pendant", area: "Dining", icon: "lamp", on: true, meta: "2 devices" },
];

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [powerOn, setPowerOn] = useState(true);
  const [temperature, setTemperature] = useState(17);
  const [activeAction, setActiveAction] = useState("air");
  const activeScreen = useMemo(() => tabs.find((tab) => tab.id === activeTab), [activeTab]);

  return (
    <main className="stage">
      <section className="phone" aria-label="Smart home app preview">
        <div className="screen">
          <StatusBar />
          {activeTab === "home" && (
            <HomeScreen
              onOpenClimate={() => setActiveTab("climate")}
              onOpenRoom={() => setActiveTab("room")}
              powerOn={powerOn}
              setPowerOn={setPowerOn}
            />
          )}
          {activeTab === "climate" && (
            <ClimateScreen
              activeAction={activeAction}
              setActiveAction={setActiveAction}
              powerOn={powerOn}
              setPowerOn={setPowerOn}
              setTemperature={setTemperature}
              temperature={temperature}
            />
          )}
          {activeTab === "room" && <RoomScreen onBack={() => setActiveTab("home")} />}
          <BottomTabs activeTab={activeTab} activeScreen={activeScreen} setActiveTab={setActiveTab} />
        </div>
      </section>
    </main>
  );
}

function StatusBar() {
  return (
    <div className="status-bar" aria-label="Device status bar">
      <span className="time">9:41</span>
      <div className="status-icons" aria-hidden="true">
        <UiIcon name="signal" size={14} weight="fill" />
        <UiIcon name="wifi" size={14} weight="bold" />
        <UiIcon name="battery" size={18} weight="regular" />
      </div>
    </div>
  );
}

function IconButton({ label, icon, variant = "ghost", onClick, children }) {
  return (
    <button className={`icon-button ${variant}`} type="button" aria-label={label} onClick={onClick}>
      {icon ? <UiIcon name={icon} size={20} weight="bold" /> : children}
    </button>
  );
}

function HomeScreen({ onOpenClimate, onOpenRoom, powerOn, setPowerOn }) {
  return (
    <div className="view home-view">
      <header className="app-header split">
        <div>
          <p className="eyebrow">Hello, Henry</p>
          <h1>Good Evening</h1>
        </div>
        <button className="temp-pill" type="button" onClick={onOpenClimate}>
          <UiIcon name="thermometer" size={18} weight="bold" />
          <span>16°C</span>
        </button>
      </header>

      <section className="energy-card">
        <div className="energy-icon">
          <UiIcon name="lightning" size={22} weight="fill" />
        </div>
        <div>
          <strong>85</strong>
          <span>kw/h</span>
          <p>Last updated 27 minutes ago</p>
        </div>
        <svg className="energy-wave" viewBox="0 0 110 42" aria-hidden="true">
          <path d="M4 27 C18 7, 32 7, 46 27 S75 47, 106 15" />
        </svg>
      </section>

      <div className="room-row" aria-label="Room filters">
        <IconButton label="Add room" icon="plus" variant="solid" />
        <button className="room-chip active" type="button">Living Room</button>
        <button className="room-chip" type="button">Bedroom</button>
      </div>

      <section className="hero-card">
        <img src="/generated/living-room-hero.png" alt="Minimal living room with sofa and plant" />
        <div className="hero-overlay">
          <span className="humidity">80%</span>
          <IconButton label="Open living room" icon="next" variant="glass" onClick={onOpenRoom} />
          <div>
            <strong>16.7°</strong>
            <p>Living Room · Cooling Mode</p>
          </div>
        </div>
      </section>

      <section className="player-card" aria-label="Speaker player">
        <div>
          <h2>Speaker</h2>
          <p>Living Room</p>
        </div>
        <div className="progress-row">
          <span>2:40</span>
          <div className="track"><span /></div>
          <span>8:20</span>
        </div>
        <div className="player-controls">
          <IconButton label="Previous track" icon="previous" />
          <IconButton label="Play" icon="play" variant="solid" />
          <IconButton label="Next track" icon="next" />
        </div>
      </section>

      <div className="mini-grid">
        <DeviceMini title="Lamp" value="80%" image="/generated/device-lamp.png" active />
        <DeviceMini title="Camera" value="Live view" image="/generated/device-camera.png" active={powerOn} onToggle={() => setPowerOn(!powerOn)} />
      </div>
    </div>
  );
}

function ClimateScreen({ temperature, setTemperature, powerOn, setPowerOn, activeAction, setActiveAction }) {
  const quickActions = [
    { id: "heat", label: "Heat", icon: "flame" },
    { id: "cold", label: "Cold", icon: "cold" },
    { id: "air", label: "Air", icon: "air" },
    { id: "humid", label: "Humid", icon: "droplet" },
  ];

  return (
    <div className="view climate-view">
      <header className="app-header nav-header">
        <IconButton label="Back to home" icon="back" onClick={() => setTemperature(17)} />
        <h1>Air Conditioner</h1>
        <IconButton label="Settings" icon="settings" />
      </header>

      <div className="segmented">
        <button type="button">Living Room</button>
        <button className="selected" type="button">Bedroom</button>
      </div>

      <section className="dial-card" aria-label="Air conditioner temperature">
        <div className="dial">
          <div className="dial-arc" />
          <div className="dial-knob" />
          <span className="dial-label top">20°</span>
          <span className="dial-label left">10°</span>
          <span className="dial-label right">30°</span>
          <div className="dial-center">
            <p>Now</p>
            <strong>{temperature}°</strong>
          </div>
        </div>
        <div className="temperature-controls">
          <IconButton label="Decrease temperature" icon="minus" onClick={() => setTemperature((value) => Math.max(10, value - 1))} />
          <IconButton
            label={powerOn ? "Turn air conditioner off" : "Turn air conditioner on"}
            icon="power"
            variant={powerOn ? "accent" : "solid"}
            onClick={() => setPowerOn(!powerOn)}
          />
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
              <UiIcon name={action.icon} size={23} weight="bold" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="schedule-card">
        <UiIcon name="fan" size={22} weight="bold" />
        <div>
          <h2>Set Automatic Schedule</h2>
          <p>Start the device automatically</p>
        </div>
        <IconButton label="Add schedule" icon="plus" variant="solid" />
      </section>
    </div>
  );
}

function RoomScreen({ onBack }) {
  return (
    <div className="view room-view">
      <section className="room-hero">
        <img src="/generated/living-room-hero.png" alt="Living room interior overview" />
        <div className="room-hero-top">
          <IconButton label="Back to home" icon="back" onClick={onBack} />
          <h1>Living Room</h1>
          <IconButton label="More room options" icon="more" />
        </div>
      </section>

      <div className="stats-pair">
        <button type="button"><UiIcon name="thermometer" size={18} />16°C</button>
        <button type="button"><UiIcon name="lightning" size={18} weight="fill" />47 kw/h</button>
      </div>

      <section className="device-grid" aria-label="Living room devices">
        {devices.map((device) => (
          <DeviceCard key={device.name} device={device} />
        ))}
      </section>
    </div>
  );
}

function DeviceCard({ device }) {
  const [on, setOn] = useState(device.on);

  return (
    <article className={on ? "device-card active" : "device-card"}>
      <p>{device.meta}</p>
      <div className="device-main">
        <div>
          <h2>{device.name}</h2>
          <span>{device.area}</span>
        </div>
        <div className="device-icon">
          <UiIcon name={device.icon} size={30} weight={on ? "fill" : "bold"} />
        </div>
      </div>
      <button className="toggle-row" type="button" aria-pressed={on} onClick={() => setOn(!on)}>
        <span>{on ? "On" : "Off"}</span>
        <span className="switch"><span /></span>
      </button>
    </article>
  );
}

function DeviceMini({ title, value, image, active, onToggle }) {
  return (
    <article className="mini-device">
      <h2>{title}</h2>
      <p>{value}</p>
      <img className="device-product" src={image} alt={`${title} product`} />
      <button className="mini-toggle" type="button" aria-label={`Toggle ${title}`} aria-pressed={active} onClick={onToggle}>
        <span />
      </button>
    </article>
  );
}

function BottomTabs({ activeTab, activeScreen, setActiveTab }) {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      {tabs.map((tab) => (
        <button
          className={activeTab === tab.id ? "tab active" : "tab"}
          key={tab.id}
          type="button"
          aria-label={`Open ${tab.label}`}
          aria-current={activeScreen?.id === tab.id ? "page" : undefined}
          onClick={() => setActiveTab(tab.id)}
        >
          <UiIcon name={tab.icon} size={22} weight={activeTab === tab.id ? "fill" : "bold"} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

createRoot(document.getElementById("root")).render(<App />);
