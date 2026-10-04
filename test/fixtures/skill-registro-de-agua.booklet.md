---
booklet: 0.6
id: "local/registro-de-agua"
title: "Registro de agua"
lang: es
version: "0.1"
status: draft
---

# Registro de agua

Un registro simple de cuánta agua tomás cada día.

> [!module|registro-de-agua] Registro de agua

Cuánta agua tomaste, y cómo te sentiste.

> [!activity|ra-dia repeat daily] Hoy

Anotá lo que puedas. Está bien si algún día te lo saltás.

> [!number|vasos min:0 max:20] ¿Cuántos vasos tomaste hoy?
> Un vaso cuenta como una unidad, del tamaño que sea.

> [!scale|animo] ¿Cómo te sentiste hoy?

0. Con mucha sed
1. Un poco seco
2. Normal
3. Bien hidratado

> [!text|nota] ¿Algo que quieras anotar?
> Podés dejarlo en blanco.

> [!module|registro-de-agua end] End of Registro de agua
