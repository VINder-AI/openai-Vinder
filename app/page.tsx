"use client";

import React from "react";
import styles from "./page.module.css";

const Home = () => {
  return (
    <main className={styles.main}>
      <div className={styles.title}>
        Welcome to Vinder AI's Chat Assistant!
      </div>
      <div className={styles.container}>
        {/* Link to your chat page */}
        <a className={styles.category} href="/chat">
          Chat with Assistant
        </a>
      </div>
    </main>
  );
};

export default Home;
