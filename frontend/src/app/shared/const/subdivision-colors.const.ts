import { ToggleButtonData } from '../components/radio-button-group/radio-button-group.component';

export const SubdivisionColors = [
  {
    title: 'Аналитика',
    subdivision_id: '5e454e0ecd5ae500129ed283',
    color: '#ffb9c7'
  },
  {
    title: 'Проектный офис',
    subdivision_id: '5e3d7163a1d401001269988f',
    color: '#ffdc7e'
  },
  {
    title: 'Разработка',
    subdivision_id: '5de66bd9d96c72001240557b',
    color: '#8bffa5'
  },
  {
    title: 'DevOps',
    subdivision_id: '5e4405bdcd5ae500129ed1d7',
    color: '#CCCCFF'
  }
];

export const RadioButtonGroupCommonColor: ToggleButtonData[] = [
  {
    title: 'Все',
    color: '#EFECEC',
    value: 'all-items'
  },
  {
    title: 'Не указано',
    color: '#8befed',
    value: 'undefined-value'
  }
];

// если в фильтре и карточках появился этот цвет,
// значит подразделений прибавилось,
// и в SubdivisionColors надо добавить информацию
export const NotFindColor = '#ff4ac7';