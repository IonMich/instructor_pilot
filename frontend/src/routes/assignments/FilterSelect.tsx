import { CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { 
  useQuery, 
  useQueryClient,
} from '@tanstack/react-query';

import Select from 'react-select';

import {
  getSectionsOfCourse,
} from '../students/students-api';

import {
  getVersionsOfAssignment,
} from '../submissions/submissions-api';

import {
  courseSectionsListQuery,
  assignmentVersionsListQuery,
} from '../assignments/Assignment';


interface SectionOption {
  label: string;
  value: string;
  section: string;
}

interface VersionOption {
  label: string;
  value: string;
  version: string;
}

interface GradeStatusOption {
    label: string;
    value: string;
    isGraded: boolean;
}

interface IdentityStatusOption {
    label: string;
    value: string;
    isIdentified: boolean;
}

interface GroupedOption {
  label: string;
  options: Array<SectionOption | VersionOption | GradeStatusOption | IdentityStatusOption>;
}

// const groupedOptions: GroupedOption[] = [
//   {
//     label: 'Section',
//     options: [
//       { label: 'Section 1', value: 'section1', section: '1' },
//       { label: 'Section 2', value: 'section2', section: '2' },
//       { label: 'Section 3', value: 'section3', section: '3' },
//     ],
//   },
//   {
//     label: 'Version',
//     options: [
//       { label: 'Version 1', value: 'version1', version: '1' },
//       { label: 'Version 2', value: 'version2', version: '2' },
//       { label: 'Version 3', value: 'version3', version: '3' },
//     ],
//   },
//   {
//     label: 'Grade Status',
//     options: [
//       { label: 'Graded', value: 'graded', isGraded: true },
//       { label: 'Ungraded', value: 'ungraded', isGraded: false },
//     ],
//   },
//   {
//     label: 'Identity Status',
//     options: [
//       { label: 'Identified', value: 'identified', isIdentified: true },
//       { label: 'Unidentified', value: 'unidentified', isIdentified: false },
//     ],
//   },
// ];

const constructGroupedOptions = (sections, versions) => {
  const groupedOptions: GroupedOption[] = [
    {
      label: 'Section',
      options: [],
    },
    {
      label: 'Version',
      options: [],
    },
    {
      label: 'Grade Status',
      options: [
        { label: 'Graded', value: 'graded', isGraded: true },
        { label: 'Ungraded', value: 'ungraded', isGraded: false },
      ],
    },
    {
      label: 'Identity Status',
      options: [
        { label: 'Identified', value: 'identified', isIdentified: true },
        { label: 'Unidentified', value: 'unidentified', isIdentified: false },
      ],
    },
  ];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    groupedOptions[0].options.push({
      label: section.name,
      value: section.id,
      section: section.id,
    });
  }

  for (let i = 0; i < versions.length; i++) {
    const version = versions[i];
    groupedOptions[1].options.push({
      label: version.name,
      value: version.id,
      version: version.id,
    });
  }

  return groupedOptions;
}



const groupStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const groupBadgeStyles: CSSProperties = {
  backgroundColor: '#EBECF0',
  borderRadius: '2em',
  color: '#172B4D',
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 'normal',
  lineHeight: '1',
  minWidth: 1,
  padding: '0.16666666666667em 0.5em',
  textAlign: 'center',
};

const formatGroupLabel = (data: GroupedOption) => (
  <div style={groupStyles}>
    <span>{data.label}</span>
    <span style={groupBadgeStyles}>{data.options.length}</span>
  </div>
);

export default function FilterSelect ( {filters, setFilters} ) {
  const params = useParams() as any

  const sections = useQuery(courseSectionsListQuery(params.courseId))
  const versions = useQuery(assignmentVersionsListQuery(params.assignmentId))

  const groupedOptions = constructGroupedOptions(sections, versions);

  function changeFilters( e ) {
    console.log(e);
    setFilters(e);
  }

  return <Select<SectionOption | VersionOption, false, GroupedOption>
    options={groupedOptions}
    styles={{
      container: (base) => ({
        ...base,
        flex: 1,
      }),
      control: (base) => ({
        ...base,
        fontWeight: "400",
        textAlign: "center",
        verticalAlign: "middle",
        border: "px solid #6c757d",
        fontSize: "1rem",
        lineHeight: "1",
        borderRadius: "0.25rem",
      }),
      placeholder: (base) => ({
        ...base,
        color: "black",
      }),
      menu: (base) => ({
        ...base,
        minWidth: "200px",
      }),
      multiValueRemove: (base) => ({
        ...base,
      }),
      multiValue: (base) => ({
        ...base,
        fontSize: "1rem",
        lineHeight: "1.3",
      }),
    }}
    placeholder="Filter"
    isMulti
    isClearable={false}
    formatGroupLabel={formatGroupLabel}
    value={filters} 
    onChange={changeFilters}
  />
}