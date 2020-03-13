import { Pipe, PipeTransform } from '@angular/core';

import { radioButtonGroupCommonColor } from '../../shared/const/subdivision-colors.const';
import { NewProjectUtils } from '../../shared/utils/new-project.utils';
import { ProjectDataModel } from '../models/project-data.model';
import { ProjectTeamsFilterModel } from '../project-teams-filter/project-teams-filter.component';

@Pipe({
  name: 'projectTeamsFilter'
})
export class ProjectTeamsFilterPipe implements PipeTransform {
  transform(projectsData: ProjectDataModel[], filter: ProjectTeamsFilterModel): ProjectDataModel[] {
    if (!projectsData) {
      return [];
    }
    if (!filter?.subdivision) {
      return projectsData;
    }

    const allItems = radioButtonGroupCommonColor[0].value;
    const undefinedValue = radioButtonGroupCommonColor[1].value;

    const activeProjectsData = projectsData
      .map(prjData => {
        const usersForProject = prjData.users
          .filter(u => !!u)
          .filter(u => NewProjectUtils.isUserHaveSameOrLastProjectInCurrentMonth(u, filter.month, prjData.projectId));

        return { ...prjData, users: usersForProject };
      })
      .filter(item => item.users && item.users.length);

    if (filter.subdivision === allItems) {
      return activeProjectsData;
    }

    if (filter.subdivision === undefinedValue) {
      return activeProjectsData.map(project => {
        const usersWithoutSubdivision = project.users.filter(user => !user.subdivision);

        return { ...project, users: usersWithoutSubdivision };
      });
    }

    return activeProjectsData.map(project => {
      const filteredUsers = project.users.filter(user => {
        return user.subdivision && user.subdivision.name && user.subdivision.name === filter.subdivision;
      });

      return { ...project, users: filteredUsers };
    });
  }
}
