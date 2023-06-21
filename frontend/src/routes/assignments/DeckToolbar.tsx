import './DeckToolbar.css'
import React from 'react'
import { BsFileEarmarkPlus } from 'react-icons/bs';
import { FaTrashAlt } from 'react-icons/fa';

const DeckToolbar = ({handleAddNew, handleDeleteAll}) => {
  return (
    <div className="header-buttons">
        <button className="header-button search-subs">
          Search        
        </button>
        <button className="header-button">Sort</button>
        <button className="header-button">Filter</button>
        <button className="header-button add-subs" onClick={handleAddNew} title="Add New Submissions">
            <BsFileEarmarkPlus />     
        </button>
        <button className="header-button delete-subs" onClick={handleDeleteAll} title="Delete All">
            <FaTrashAlt />
        </button>
    </div>
  )
}

export default DeckToolbar