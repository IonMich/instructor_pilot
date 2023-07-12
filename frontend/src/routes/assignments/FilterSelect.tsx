import { CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { 
  useQuery,
} from '@tanstack/react-query';

import Select from 'react-select';

import {
  courseSectionsListQuery,
  assignmentVersionsListQuery,
} from './queries';


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

const constructGroupedOptions = (sections, versions) => {
  console.log("sections", sections);
  console.log("versions", versions);
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
    console.log("section", section);
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
  // add also a "no version" option
  groupedOptions[1].options.push({
    label: "No Version",
    value: "no-version",
    version: "no-version",
  });


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

export default function FilterSelect ( {filters, setFilters, versions} ) {
  const params = useParams() as any

  const {data: sections} = useQuery(courseSectionsListQuery(params.courseId))
  // const {data: versions} = useQuery(assignmentVersionsListQuery(params.assignmentId))

  const groupedOptions = constructGroupedOptions(sections, versions);
  console.log("groupedOptions", groupedOptions);

  function changeFilters( e ) {
    console.log(e);
    setFilters(e);
  }

  return <Select
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
      menuList: (base) => ({
        ...base,
        scrollBehavior: "smooth",
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