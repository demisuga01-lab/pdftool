# Product Overview

## Purpose

Explain what PDFTools by WellFriend is and what it is not.

## Audience

- Product owners
- Developers
- Support staff
- New contributors

## Scope

This file covers the product definition, target users, current public policy, and implementation boundaries.

Website documentation route: `/docs`

## What the Product Is

PDFTools by WellFriend is a public web workspace for PDF and image processing. It is designed around quick, browser-driven workflows where a user uploads a file, previews it, adjusts settings, launches processing, and downloads a result.

## What It Is For

- lightweight file conversion
- common PDF operations
- common image operations
- OCR and searchable export
- drag-based watermark placement
- no-signup public usage

## What It Is Not

- not a user-account platform today
- not the future authenticated API product yet
- not a long-term file storage system
- not a zero-retention secure vault
- not an unlimited public processing service

## Public Website Facts

- Website: `https://tools.wellfriend.online`
- Publicly free for now
- Files deleted after `24 hours`
- Maximum file size `25 MB`
- Global rate limit `200 requests/hour/IP`

## Current Tool Families

- Shared: compress, convert, OCR
- PDF: merge, split, rotate, watermark, protect, decrypt, extract text, PDF to images, images to PDF, Office to PDF
- Image: resize, batch resize, rotate, crop, watermark, info, remove background

## Target Users

- casual users needing quick file manipulation
- developers and operators testing document workflows
- teams needing an open source and self-hostable starting point

## Planned but Not Implemented Here

- authenticated API product at `api.wellfriend.online`
- API keys and billing
- user accounts
- admin dashboard

## Related Documents

- [../README.md](../README.md)
- [features-index.md](./features-index.md)
- [future-api-platform.md](./future-api-platform.md)
