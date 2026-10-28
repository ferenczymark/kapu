/*
TÍPUSOK SZABÁLYKÖNYVE (types/index.ts) - ELI5 MAGYARÁZAT
=========================================================================

Ez a fájl a te projekted "szótára" vagy "szabálykönyve".

Képzeld el, hogy a programozás olyan, mint egy játék. Ahhoz, hogy a számítógép értse a szabályokat, pontosan meg kell határoznunk, hogy mi micsoda.

Mit írunk le ebben a szabálykönyvben?

1. Mi az az "Eszköz" (Device)?
   Leírjuk, hogy a mi játékunkban egy kapunyitó eszköznek kötelezően rendelkeznie kell az alábbi tulajdonságokkal:
   - Egy azonosító (id), ami egy egyedi szám vagy szöveg.
   - Egy név (pl. "Nagykapu").
   - Egy típus (pl. "kapunyitó").
   - Egy státusz (ami csak "online" vagy "offline" lehet, semmi más!).
   - Egy MQTT csatorna név (pl. "haz/kapu1").

2. Miért jó ez a szabálykönyv?
   Ha a valódi kódban véletlenül elírsz egy szót (pl. `stautus`-t írsz `status` helyett), a kód-szerkesztő program azonnal pirossal aláhúzza és rád szól: "Hé! A szabálykönyv szerint ilyen mező nem létezik!". Így rengeteg bosszantó elírástól és hibától ment meg.
=========================================================================*/
