---
title: "Cartridge Player"
date: 2025-07-22
description: "An RFID-based media player that uses physical cartridges to select what to play"
tags:
  - electronics
  - esp32
  - rfid
  - build
draft: true
---

## Background

*TODO: What inspired the cartridge player? Why physical media in a streaming world?*

## What it is

A physical media player that uses RFID cartridges — slot one in and it plays the associated content. Each cartridge has an NFC tag with a unique ID mapped to a playlist or album. A modern take on a tape deck with the flexibility of streaming.

## The Build

- **Microcontroller:** Seeed XIAO ESP32-S3
- **RFID Reader:** RC522 (SPI)
- **Buzzer** for feedback

Each cartridge is a 3D-printed case with an NFC tag inside. The player reads the tag ID and maps it to content.

| Cartridge | ID |
|-----------|-----|
| White     | `04-32-21-12-C3-58-81` |
| Gray      | `04-46-3C-32-4C-58-81` |
| Beige     | `04-43-21-12-C3-58-81` |

## Gallery

> [!gallery]
> ![[cartridge-player-1.png]]
> ![[cartridge-player-2.png]]

## Related Posts

*Build log coming soon.*

<script src="/static/lightbox.js"></script>
