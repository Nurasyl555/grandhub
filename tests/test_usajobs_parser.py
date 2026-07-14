from app.parsers.internship.usajobs import _to_internship_create

SAMPLE_ITEM = {
    "MatchedObjectId": "21947200",
    "MatchedObjectDescriptor": {
        "PositionTitle": "STUDENT TRAINEE (IT SPECIALIST)",
        "PositionURI": "https://www.usajobs.gov/GetJob/ViewDetails/21947200",
        "PositionLocation": [
            {
                "LocationName": "Point Loma Complex, San Diego, California",
                "CountryCode": "United States",
                "CountrySubDivisionCode": "California",
            }
        ],
        "OrganizationName": "Space and Naval Warfare Systems Command",
        "PositionOfferingType": [{"Name": "Internships", "Code": "15328"}],
        "PositionSchedule": [{"Name": "Full Time", "Code": "1"}],
        "QualificationSummary": "Open to students enrolled in an accredited degree program.",
        "PositionRemuneration": [
            {"MinimumRange": "45000", "MaximumRange": "58000", "RateIntervalCode": "PA"}
        ],
        "PositionStartDate": "2026-06-05T00:00:00Z",
        "ApplicationCloseDate": "2026-12-01T00:00:00Z",
        "UserArea": {"Details": {"JobSummary": "Fallback summary"}},
    },
}


def test_maps_core_fields():
    result = _to_internship_create(SAMPLE_ITEM)

    assert result.title == "STUDENT TRAINEE (IT SPECIALIST)"
    assert str(result.source_url) == "https://www.usajobs.gov/GetJob/ViewDetails/21947200"
    assert result.provider == "Space and Naval Warfare Systems Command"
    assert result.country == "United States"
    assert result.region == "California"
    assert result.duration == "Full Time"


def test_marks_paid_when_remuneration_present():
    result = _to_internship_create(SAMPLE_ITEM)
    assert result.paid is True


def test_unpaid_when_remuneration_missing():
    item = {
        "MatchedObjectDescriptor": {
            **SAMPLE_ITEM["MatchedObjectDescriptor"],
            "PositionRemuneration": [],
        }
    }
    result = _to_internship_create(item)
    assert result.paid is None


def test_parses_deadline_and_published_at():
    result = _to_internship_create(SAMPLE_ITEM)
    assert result.deadline is not None
    assert result.deadline.year == 2026
    assert result.deadline.month == 12
    assert result.published_at.month == 6


def test_falls_back_to_job_summary_when_qualification_summary_missing():
    item = {
        "MatchedObjectDescriptor": {
            **SAMPLE_ITEM["MatchedObjectDescriptor"],
            "QualificationSummary": "",
        }
    }
    result = _to_internship_create(item)
    assert result.description == "Fallback summary"
