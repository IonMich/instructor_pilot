import './DeckToolbar.css'
import { BsFileEarmarkPlus } from 'react-icons/bs';
import { FaTrashAlt } from 'react-icons/fa';
import FilterSelect from './FilterSelect';

const DeckToolbar = ({ filters, setFilters, handleAddNew, handleDeleteAll }) => {
  // allow user to filter by section, version and graded/ungarded
  return (
    <div className="header-buttons">
        <button className="header-button search-subs">
          Search        
        </button>
        <button className="header-button">Sort</button>
        <div className="filter-subs">
          <FilterSelect filters={filters} setFilters={setFilters} />
        </div>
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