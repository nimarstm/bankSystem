from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import FraudReport


class FraudReportListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        reports = FraudReport.objects.order_by("-created_at", "-pk")
        return Response([
            {
                "id": r.id,
                "user_id": r.user_id,
                "score": r.score,
                "decision": r.decision,
                "transaction_id": r.transaction_id,
                "reason": r.reason,
                "created_at": r.created_at,
            }
            for r in reports
        ])
