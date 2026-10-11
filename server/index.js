"use strict";
/* ================= heimERP Server – Startpunkt =================
   Start:  node server/index.js   (PM2: pm2 start server/index.js)
   Env:    PORT (Default 3000)
           DATEN_DIR (Default ../Daten – in Produktion /var/lib/heimerp/daten)

   Bewusst ohne "require.main === module": PM2 startet im Fork-Modus über
   einen eigenen Container-Prozess, dort wäre die Bedingung falsch und der
   Server würde nie lauschen. Die App selbst liegt in app.js. */
const app = require("./app");
const { DATEN_DIR } = require("./hilfen");

const PORT = parseInt(process.env.PORT, 10) || 3000;

app.listen(PORT, () => {
  console.log("heimERP-Server läuft auf Port " + PORT + ", Daten in " + DATEN_DIR);
});
