import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import * as moment from 'moment';
import { radioButtonGroupCommonColor } from '../../shared/const/subdivision-colors.const';
import { ToggleButtonDataModel } from '../../shared/components/radio-button-group/radio-button-group.model';

import { BreakpointObserver } from '@angular/cdk/layout';
import { SelectInputDataModel } from '../../shared/components/single-select/single-select.component';

export interface ProjectTeamsFilterModel {
  month: moment.Moment;
  subdivision: string;
}

@Component({
  selector: 'app-project-teams-filter',
  templateUrl: './project-teams-filter.component.html',
  styleUrls: ['./project-teams-filter.component.scss']
})
export class ProjectTeamsFilterComponent implements OnInit {
  public isMobileVersion: boolean;

  @Input()
  filtersForm: FormGroup;

  @Input()
  subdivision: ToggleButtonDataModel[];

  @Input()
  subdivisions: SelectInputDataModel[];

  public filterInfo = radioButtonGroupCommonColor;
  public date$ = new BehaviorSubject<moment.Moment>(moment());
  public defaultState: string;

  constructor(private breakpointObserver: BreakpointObserver) {}

  ngOnInit(): void {
    this.defaultState = this.filterInfo[0].value;
    this.filtersForm.patchValue({ subdivision: this.defaultState });

    this.breakpointObserver
      .observe(['(max-width: 767px)'])
      .subscribe(result => (this.isMobileVersion = result.matches));
    console.log(this.filtersForm);
  }

  public prevMonth(): void {
    const newData = this.date$.value.clone().subtract(1, 'months');
    this.date$.next(newData);
    this.changeData(newData);
  }

  public nextMonth(): void {
    const newData = this.date$.value.clone().add(1, 'months');
    this.date$.next(newData);
    this.changeData(newData);
  }

  public changeSubdivision($event) {
    this.filtersForm.patchValue({ subdivision: $event });
  }

  public changeData(data) {
    this.filtersForm.patchValue({ month: data });
  }
}
