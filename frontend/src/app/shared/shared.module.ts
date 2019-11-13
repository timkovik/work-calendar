import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AvatarModule } from 'ngx-avatar';
import { MaterialModule } from '../material.module';
import { AgendaComponent } from './components/agenda/agenda.component';
import { SnackbarComponent } from './components/snackbar/snackbar.component';
import { TransformTaskTypePipe } from './pipes/calendar/transform-task-type.pipe';
import { DatePipe } from './pipes/date.pipe';
import { CurrentEmployeePipe } from './pipes/description-history/current-employee.pipe';
import { TaskTypePipe } from './pipes/description-history/task-type.pipe';
import { FilterEmployeePipe } from './pipes/filter-employee.pipe';
import { FilterTeamEmployeePipe } from './pipes/filter-team-employee.pipe';
import { UsernamePipe } from './pipes/username.pipe';

const pipes = [
  UsernamePipe,
  DatePipe,
  TaskTypePipe,
  CurrentEmployeePipe,
  TransformTaskTypePipe,
  FilterEmployeePipe,
  FilterTeamEmployeePipe
];
const modules = [MaterialModule, FormsModule, ReactiveFormsModule, AvatarModule, NgbModule, RouterModule];

const components = [AgendaComponent, SnackbarComponent];
@NgModule({
  declarations: [...pipes, ...components],
  imports: [CommonModule, ...modules],
  exports: [...pipes, ...modules, ...components],
  entryComponents: [SnackbarComponent]
})
export class SharedModule {}
