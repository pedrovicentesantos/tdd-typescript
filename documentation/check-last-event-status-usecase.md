# CheckLastEventStatusUseCase

## Data

- Group ID

## Primary flow

- Get group's last event data (end date and review duration)
- Return "active" status if event is not over

## Alternative flow: Event is at limit of ending

- Return "active"

## Alternative flow: Event is closed, but is during review hours

- Return "in review"

## Alternative flow: Event and review time is over

- Return "closed"

## Alternative flow: Group doesn't have any events

- Return "closed"

