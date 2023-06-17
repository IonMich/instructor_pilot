import './Footer.css'
import React from 'react'

const Footer = () => {
    const today = new Date();
  return (
    <footer>
        <p>
            &copy; {today.getFullYear()} - Instructor Pilot
        </p>
    </footer>
  )
}

export default Footer