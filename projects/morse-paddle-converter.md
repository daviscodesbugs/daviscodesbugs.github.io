---
title: "Morse Code Paddle Converter"
date: 2024-03-21
description: "A USB-C control box that lets you use a physical morse code paddle with the Morse Mania app"
tags:
  - electronics
  - morse-code
  - build
draft: false
---

## Background

I use [Morse Mania](https://dong.digital/morsemania/) to practice keying, listening, and decoding morse code signals. Tapping on a screen works, but it doesn't build the muscle memory you get from a real paddle. I wanted to practice with the physical thing.

## What it is

A small control box that bridges a physical morse code paddle to the Morse Mania Android app. Plug in your paddle on one side, plug USB-C into your phone on the other, and practice keying real code on a real paddle.

## The Build

- **Input:** 3.5mm jack for the paddle connection (standard for morse paddles)
- **Microcontroller:** Reads paddle contacts and converts closures to USB HID keystrokes
- **Output:** USB-C to connect directly to a phone
- **Enclosure:** A compact control box sitting between the paddle and phone

Morse Mania supports keyboard input to simulate paddle dits and dahs. The microcontroller reads the paddle contacts and emits the corresponding keystrokes over USB. As far as the phone is concerned, it's just a keyboard — no special drivers or app modifications needed.

## Gallery

> [!gallery]
> ![[morse.jpg]]

## Related Posts

*Build log coming soon.*

<script src="/static/lightbox.js"></script>
