"use client"

import React from "react"
import ShinyText from "@/components/ui/shiny-text"

interface ShinyBrandProps {
    className?: string
    leftSizeClass?: string
    rightSizeClass?: string
    speed?: number
    white?: boolean
    variant?: 'pill' | 'plain'
}

const ShinyBrand: React.FC<ShinyBrandProps> = ({
	className = "",
	leftSizeClass = "text-3xl sm:text-4xl",
	rightSizeClass = "text-2xl sm:text-3xl",
	speed = 3,
    white = true,
    variant = 'pill',
}) => {
	const animationDuration = `${speed}s`

    return (
		<div className={`relative inline-flex items-baseline gap-1 ${variant === 'pill' ? 'rounded-full border border-white/60 bg-white/10 px-3 py-1' : ''} ${className}`}>
            <div className="relative z-10 flex items-baseline gap-1" style={{ fontFamily: 'Circular, Helvetica Neue, Arial, sans-serif' }}>
                <ShinyText
                    text="flowcore"
                    speed={speed}
                    className={`font-semibold tracking-tight ${leftSizeClass}`}
                    gradient={white ? "linear-gradient(to right, #ffffff 0%, #ffffff 100%)" : "linear-gradient(to right, #dc2626 0%, #ea580c 50%, #f97316 100%)"}
                />
                <ShinyText
                    text="social."
                    speed={speed}
                    className={`font-medium tracking-tight ${rightSizeClass}`}
                    gradient={white ? "linear-gradient(to right, #ffffff 0%, #ffffff 100%)" : "linear-gradient(to right, #3b82f6 0%, #22d3ee 60%, #14b8a6 100%)"}
                />
            </div>
        </div>
    )
}

export default ShinyBrand


