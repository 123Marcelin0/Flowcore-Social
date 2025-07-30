import 'dotenv/config'
import React from 'react'
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

global.React = React
