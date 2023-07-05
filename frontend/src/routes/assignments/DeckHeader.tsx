import { useParams } from 'react-router-dom';

import { 
  useQueryClient,
} from '@tanstack/react-query';

import './DeckHeader.css'
import DeckToolbar from './DeckToolbar'

const DeckHeader = (props) => {
  const params = useParams() as any
  const assignmentId = params.assignmentId
  const queryClient = useQueryClient()

  async function handleDeleteAll() {
    console.log('handleDeleteAll')
    await props.setSubs([], assignmentId)
    queryClient.invalidateQueries(['submissions', 'list', assignmentId])
  }

  return (
    <header>
        <h1>
            {props.title}
            <span className="submission-counter">
              {(props.filters.length == 0) ? 
                `${props.subs.length}` :
                `${props.filteredSubmissionsLength} of ${props.subs.length}`
              }
            </span>
        </h1>
        <DeckToolbar filters={props.filters} setFilters={props.setFilters} handleAddNew={props.handleAddNew} handleDeleteAll={handleDeleteAll} />
    </header>
  )
}

export default DeckHeader