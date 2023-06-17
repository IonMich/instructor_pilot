import './DeckHeader.css'
import DeckToolbar from './DeckToolbar'
import React from 'react'

const DeckHeader = (props) => {

  function handleDeleteAll() {
    props.setSubs([]);
  }

  return (
    <header>
        <h1>
            {props.title}
            <span className="submission-counter">
              {props.subs.length}
            </span>
        </h1>
        <DeckToolbar handleAddNew={props.handleAddNew} handleDeleteAll={handleDeleteAll} />
    </header>
  )
}

DeckHeader.defaultProps = {
    title: "Submissions",
    subs: [],
}

export default DeckHeader