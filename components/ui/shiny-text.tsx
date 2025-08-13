"use client"

import React from "react"

interface ShinyTextProps {
    text: string
    disabled?: boolean
    speed?: number
    className?: string
    gradient?: string // base gradient behind the shine
}

const ShinyText: React.FC<ShinyTextProps> = ({
	text,
	disabled = false,
	speed = 5,
    className = "",
    gradient,
}) => {
    const animationDuration = `${speed}s`
    const baseGradient =
        gradient ||
        "linear-gradient(to right, #dc2626 0%, #ea580c 50%, #f97316 100%)"
    const shineBand =
        "linear-gradient(120deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.85) 50%, rgba(255, 255, 255, 0) 60%)"

	return (
        <>
            <div
                className={`text-transparent bg-clip-text inline-block ${className}`}
                style={{
                    backgroundImage: `${shineBand}, ${baseGradient}`,
                    backgroundSize: "200% 100%, 100% 100%",
                    backgroundPosition: "100% 0, 0 0",
                    WebkitBackgroundClip: "text",
                    animation: disabled ? undefined : `flowcore-shine ${animationDuration} linear infinite`,
                }}
            >
                {text}
            </div>
            <style jsx>{`
                @keyframes flowcore-shine {
                    0% { background-position: 100% 0, 0 0; }
                    100% { background-position: -100% 0, 0 0; }
                }
            `}</style>
        </>
	)
}

export default ShinyText


