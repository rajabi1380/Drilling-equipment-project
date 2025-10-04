import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar";
import Sidebar from "./Components/Sidebar";
import InOut from './Components/InOut';
import Turning from './Components/Turning';


// import InOut from "./Componentsnpm i react-multi-date-picker react-date-object/InOut";        // ⟵ صفحهٔ واقعی را ایمپورت کن
import Request from "./Components/Request";    // (در صورت وجود)
import "./App.css";

const Dashboard = () => <h1>داشبورد</h1>;

export default function App(){
  const [sbOpen, setSbOpen] = useState(false);
  const holidaysFa = ["1403-01-01","1403-01-02","1403-03-14","1403-06-31"];

  return (
    <div dir="rtl">
      <Navbar
        onLogout={() => alert("خروج")}
        onHamburger={() => setSbOpen(true)}
        holidaysFa={holidaysFa}
        notifications={[]}
      />

      <Sidebar open={sbOpen} onClose={() => setSbOpen(false)} />

      <main className="page">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/maintenance/inout" element={<InOut />} />
          <Route path="/maintenance/request" element={<Request />} />
          <Route path="/maintenance/turning" element={<Turning />} />
          <Route path="*" element={<h1>صفحهٔ موردنظر یافت نشد!</h1>} />
        </Routes>
      </main>
    </div>
  );
}
